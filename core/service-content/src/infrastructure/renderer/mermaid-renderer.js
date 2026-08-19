// Puppeteer ile yerel bir HTML icine gomulu Mermaid'i render edip PNG uretir.
// Dolgu arka plan + padding kullanilir ki dev.to'nun hem acik hem koyu temasinda okunur kalsin.
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

export const makeMermaidRenderer = ({ mermaidJsSource, scale = 2 }) => ({
  renderMermaidToPng: async (mermaidSource) => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 900, height: 600, deviceScaleFactor: scale });
      await page.setContent(htmlTemplate(mermaidSource, mermaidJsSource), { waitUntil: 'networkidle0' });
      await page.waitForSelector('.mermaid svg', { timeout: 15_000 });

      const element = await page.$('.mermaid');
      const buffer = await element.screenshot({ type: 'png' });
      return buffer;
    } finally {
      await browser.close();
    }
  },
});

export { MERMAID_CDN_FALLBACK_NOTE };
