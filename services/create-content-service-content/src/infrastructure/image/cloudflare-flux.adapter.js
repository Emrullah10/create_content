import sharp from 'sharp';
import { renderPrompt } from '../llm/prompt-loader.js';
import { withRetry } from '../helper/retry.js';
import { parseRetryAfter } from '../helper/retry-after-parser.js';

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 630;
const MODEL = '@cf/black-forest-labs/flux-1-schnell';

// Cloudflare Workers AI (flux-1-schnell): kart istemeyen ucretsiz katman (~10k neuron/gun). KARE (1024x1024) dondurur;
// merkezden 1200x630'a kirpilir ve DOSYA GERCEKTEN PNG olarak kodlanir (eski surum JPEG'i png diye etiketliyordu).
export const makeCloudflareCoverGenerator = ({ accountId, apiToken, fetchImpl = fetch, sleep }) => {
  if (!accountId || !apiToken) throw new Error('Cloudflare cover generator requires accountId and apiToken');
  return {
    generateCover: async (coverPrompt) => {
      // Once kirp, SONRA sablonu doldur: sablonun sonundaki "no embedded text" cumlesi kesilmesin.
      const prompt = renderPrompt('cover', { cover_prompt: String(coverPrompt).slice(0, 500) });
      const payload = await withRetry(
        async () => {
          const res = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
            method: 'POST',
            headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
            body: JSON.stringify({ prompt }),
            signal: AbortSignal.timeout(120_000),
          });
          if (!res.ok) throw Object.assign(new Error(`Cloudflare image API ${res.status}: ${(await res.text()).slice(0, 200)}`), { status: res.status, retryAfter: res.headers.get('retry-after') });
          const json = await res.json();
          if (!json?.result?.image) throw new Error('Cloudflare image API returned no image');
          return json.result.image;
        },
        // Ucretsiz katmanda ardisik isteklerde 429 goruldu: Retry-After'a uyarak yeniden denenir.
        { attempts: 4, baseDelayMs: 3000, shouldRetry: (e) => e.status === undefined || e.status === 429 || e.status >= 500, delayMs: (e) => parseRetryAfter(e.retryAfter) ?? undefined, sleep },
      );
      return sharp(Buffer.from(payload, 'base64')).resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'cover', position: 'centre' }).png().toBuffer();
    },
  };
};

// Test/E2E: ag yok, gercek bir PNG uretir.
export const makeFakeCoverGenerator = () => ({
  generateCover: async () => sharp({ create: { width: COVER_WIDTH, height: COVER_HEIGHT, channels: 3, background: { r: 38, g: 70, b: 120 } } }).png().toBuffer(),
});
