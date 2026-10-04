import { setPort } from './ports.js';
import { installLlmFromEnv } from './llm/install-from-env.js';
import { makeFetchPage } from './research/fetch-page.js';
import { makeWikipedia, makeGithub, makeStackExchange } from './research/providers.js';
import { makeResearchGatherer } from './research/gatherer.js';
import { makeMermaidRenderer } from './renderer/mermaid-renderer.js';
import { loadMermaidSource } from './renderer/mermaid-js-source.js';
import { makeCloudflareCoverGenerator, makeFakeCoverGenerator } from './image/cloudflare-flux.adapter.js';
import { makeGithubAssetHost, makeFakeAssetHost } from './asset-host/github.adapter.js';
import { makeFakeResearch, makeFakeRenderer } from './fakes.js';

const PLACEHOLDER = /^(your-|changeme|<)/i;
const real = (v) => Boolean(v && v.trim() && !PLACEHOLDER.test(v.trim()));

// Tum portlari env'den kurar. Tetikleyici anahtar yoksa port KURULMAZ (hata fırlatmaz; kullanilinca PORT_NOT_CONFIGURED).
// LLM_PROVIDER=fake ise HEPSI sahte kurulur ve NODE_ENV=production'da REDDEDILIR.
export const installPortsFromEnv = ({ env = process.env, recorder, logger = console } = {}) => {
  const llm = installLlmFromEnv({ env, recorder, logger });
  const summary = { llm: llm.provider ?? 'not configured' };

  if (env.LLM_PROVIDER === 'fake') {
    setPort('research', makeFakeResearch(), 'fake');
    setPort('renderer', makeFakeRenderer(), 'fake');
    setPort('imageGenerator', makeFakeCoverGenerator(), 'fake');
    setPort('assetHost', makeFakeAssetHost(), 'fake');
    return { ...summary, research: 'fake', renderer: 'fake', imageGenerator: 'fake', assetHost: 'fake' };
  }

  const gatherer = makeResearchGatherer({
    fetchPage: makeFetchPage(),
    wikipedia: makeWikipedia(),
    github: makeGithub({ token: real(env.GITHUB_TOKEN) ? env.GITHUB_TOKEN : undefined }),
    stackexchange: makeStackExchange(),
    logger,
  });
  setPort('research', { gather: gatherer }, 'web+github+stackexchange+wikipedia');
  setPort('renderer', makeMermaidRenderer({ mermaidJsSource: loadMermaidSource() }), 'puppeteer-mermaid');
  summary.research = 'real';
  summary.renderer = 'puppeteer-mermaid';

  if (real(env.CLOUDFLARE_ACCOUNT_ID) && real(env.CLOUDFLARE_API_TOKEN)) {
    setPort('imageGenerator', makeCloudflareCoverGenerator({ accountId: env.CLOUDFLARE_ACCOUNT_ID, apiToken: env.CLOUDFLARE_API_TOKEN }), 'cloudflare-flux-1-schnell');
    summary.imageGenerator = 'cloudflare';
  } else {
    setPort('imageGenerator', null);
    logger.warn?.('[ports] CLOUDFLARE_* not configured: cover images will fail (article stays in needs_assets)');
  }
  if (real(env.GITHUB_TOKEN) && real(env.GITHUB_ASSETS_REPO)) {
    setPort('assetHost', makeGithubAssetHost({ token: env.GITHUB_TOKEN, repo: env.GITHUB_ASSETS_REPO, branch: env.GITHUB_ASSETS_BRANCH || 'main' }), `github:${env.GITHUB_ASSETS_REPO}`);
    summary.assetHost = 'github';
  } else {
    setPort('assetHost', null);
    logger.warn?.('[ports] GITHUB_TOKEN / GITHUB_ASSETS_REPO not configured: image upload will fail (article stays in needs_assets)');
  }
  return summary;
};
