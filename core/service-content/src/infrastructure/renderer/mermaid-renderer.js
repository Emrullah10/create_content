// Puppeteer ile yerel bir HTML icine gomulu Mermaid'i render edip PNG uretir.
// Dolgu arka plan + padding kullanilir ki dev.to'nun hem acik hem koyu temasinda okunur kalsin.
//
// mermaid.parse() dogrudan Node'da CALISMAZ (DOMPurify 'window' bekliyor, gecerli
// flowchart'ta bile yanlis pozitif verir — dogrulandi). Bu yuzden hem dogrulama hem
// render AYNI puppeteer sayfasi icinde, gercek tarayici DOM'unda yapilir.
//
// Onceden her render icin ayri puppeteer.launch() aciliyordu (~600ms fazladan her
// diyagramda) ve protocolTimeout ayarlanmamisti — bu, "Runtime.callFunctionOn timed
// out" hatalarinin ana kaynagiydi (bkz buglog). Artik tek browser + tek "kalici sayfa"
// instance'i reuse edilir.
import puppeteer from 'puppeteer';

const MERMAID_CDN_FALLBACK_NOTE = 'mermaid.min.js buraya build-time bundle edilmeli (bkz scripts); CDN kullanilmiyor.';

const htmlTemplate = (mermaidSource, mermaidJsInline) => `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { margin: 0; padding: 24px; background: #ffffff; display: inline-block; }
  .mermaid { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
</style>
</head>
<body>
  <div class="mermaid">${mermaidSource}</div>
  <script>${mermaidJsInline}</script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
</body>
</html>`;

// Dogrulama sayfasi: startOnLoad kapali, mermaid bir kez yuklu kalir, tekrar tekrar
// window.mermaid.parse() cagrilir. Render sayfasindan ayri cunku her diyagram icin
// yeniden setContent gerektirmez.
const validatorHtml = (mermaidJsInline) => `
<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
  <script>${mermaidJsInline}</script>
  <script>
    mermaid.initialize({ startOnLoad: false });
  </script>
</body>
</html>`;

export const makeMermaidRenderer = ({ mermaidJsSource, scale = 2 }) => {
  let browserPromise = null;
  let validatorPagePromise = null;

  const getBrowser = () => {
    if (!browserPromise) {
      browserPromise = puppeteer.launch({
        headless: true,
        args: ['--no-sandbox'],
        protocolTimeout: 180_000,
      });
    }
    return browserPromise;
  };

  const getValidatorPage = async () => {
    if (!validatorPagePromise) {
      validatorPagePromise = (async () => {
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setContent(validatorHtml(mermaidJsSource), { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof window.mermaid?.parse === 'function', { timeout: 15_000 });
        return page;
      })();
    }
    return validatorPagePromise;
  };

  return {
    // Gercek mermaid parser'i ile dogrular — regex tahminine gore %100 isabetli
    // (dogrulandi: 8/8 gercek hatali ornek yakalandi, 0 yanlis pozitif).
    validateMermaid: async (mermaidSource) => {
      const page = await getValidatorPage();
      return page.evaluate(async (source) => {
        try {
          await window.mermaid.parse(source);
          return { valid: true, error: null };
        } catch (err) {
          return { valid: false, error: err?.message ?? String(err) };
        }
      }, mermaidSource);
    },

    renderMermaidToPng: async (mermaidSource) => {
      const browser = await getBrowser();
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 900, height: 600, deviceScaleFactor: scale });
        await page.setContent(htmlTemplate(mermaidSource, mermaidJsSource), { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.mermaid svg', { timeout: 15_000 });

        // Mermaid syntax hatasinda exception atmaz, kirmizi "bomba" hata SVG'si cizer —
        // waitForSelector bunu da basari sayar, bu yuzden ayrica kontrol etmek gerekiyor.
        const isError = await page.$eval('.mermaid svg', (svg) =>
          svg.getAttribute('aria-roledescription') === 'error' || !!svg.querySelector('.error-icon'),
        );
        if (isError) throw new Error('mermaid syntax error: renderer produced an error diagram');

        const element = await page.$('.mermaid');
        const box = await element.boundingBox();
        if (!box || box.width === 0 || box.height === 0) {
          throw new Error('mermaid render produced a zero-size element (layout failed)');
        }

        return await element.screenshot({ type: 'png' });
      } finally {
        await page.close();
      }
    },

    closeBrowser: async () => {
      if (validatorPagePromise) {
        const page = await validatorPagePromise.catch(() => null);
        await page?.close().catch(() => {});
        validatorPagePromise = null;
      }
      if (browserPromise) {
        const browser = await browserPromise.catch(() => null);
        await browser?.close().catch(() => {});
        browserPromise = null;
      }
    },
  };
};

export { MERMAID_CDN_FALLBACK_NOTE };
