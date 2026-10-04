// Puppeteer ile yerel bir HTML icine gomulu Mermaid'i render edip PNG uretir (CDN yok). Dolgulu beyaz arka plan: dev.to'nun
// acik ve koyu temasinda okunur.
// mermaid.parse() Node'da dogrudan CALISMAZ (DOMPurify 'window' ister): dogrulama ve render AYNI tarayici DOM'unda yapilir.
// Tek browser + kalici dogrulama sayfasi yeniden kullanilir (her render'da launch ~600 ms ekler ve protocolTimeout eksikligi
// "Runtime.callFunctionOn timed out" uretiyordu).
import puppeteer from 'puppeteer';

const htmlTemplate = (src, js) => `<!doctype html><html><head><meta charset="utf-8"/><style>
body { margin: 0; padding: 24px; background: #ffffff; display: inline-block; }
.mermaid { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
</style></head><body><div class="mermaid">${src.replace(/</g, '&lt;')}</div><script>${js}</script><script>mermaid.initialize({ startOnLoad: true, theme: 'default' });</script></body></html>`;

const validatorHtml = (js) => `<!doctype html><html><head><meta charset="utf-8"/></head><body><script>${js}</script><script>mermaid.initialize({ startOnLoad: false });</script></body></html>`;

export const makeMermaidRenderer = ({ mermaidJsSource, scale = 2 }) => {
  let browserPromise = null;
  let validatorPromise = null;

  const getBrowser = () => {
    browserPromise ??= puppeteer.launch({ headless: true, args: ['--no-sandbox'], protocolTimeout: 180_000 });
    return browserPromise;
  };
  const getValidatorPage = () => {
    validatorPromise ??= (async () => {
      const page = await (await getBrowser()).newPage();
      await page.setContent(validatorHtml(mermaidJsSource), { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.mermaid?.parse === 'function', { timeout: 15_000 });
      return page;
    })();
    return validatorPromise;
  };

  return {
    // Gercek mermaid parser'i (regex tahminine gore cok daha isabetli).
    validateMermaid: async (source) => {
      const page = await getValidatorPage();
      return page.evaluate(async (s) => {
        try {
          await window.mermaid.parse(s);
          return { valid: true, error: null };
        } catch (err) {
          return { valid: false, error: err?.message ?? String(err) };
        }
      }, source);
    },

    renderMermaidToPng: async (source) => {
      const page = await (await getBrowser()).newPage();
      try {
        await page.setViewport({ width: 900, height: 600, deviceScaleFactor: scale });
        await page.setContent(htmlTemplate(source, mermaidJsSource), { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.mermaid svg', { timeout: 15_000 });
        // Sozdizimi hatasinda mermaid exception atmaz, kirmizi "bomba" SVG cizer; waitForSelector bunu da basari sayar.
        const isError = await page.$eval('.mermaid svg', (svg) => svg.getAttribute('aria-roledescription') === 'error' || !!svg.querySelector('.error-icon'));
        if (isError) throw new Error('mermaid syntax error: renderer produced an error diagram');
        const element = await page.$('.mermaid');
        const box = await element.boundingBox();
        if (!box || box.width === 0 || box.height === 0) throw new Error('mermaid render produced a zero-size element (layout failed)');
        return Buffer.from(await element.screenshot({ type: 'png' }));
      } finally {
        await page.close();
      }
    },

    closeBrowser: async () => {
      const page = await validatorPromise?.catch(() => null);
      await page?.close().catch(() => {});
      validatorPromise = null;
      const browser = await browserPromise?.catch(() => null);
      await browser?.close().catch(() => {});
      browserPromise = null;
    },
  };
};
