import { normalizeTags } from '../theme/theme-rules.js';

export const DEVTO_MAX_TAGS = 4;
export const DEVTO_MAX_TITLE = 128;
export const DEVTO_MAX_DESCRIPTION = 170;

const clip = (text, max) => {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.floor(max * 0.6))).trimEnd()}…`;
};

// dev.to: etiketler kucuk harf ve tiresiz (sessizce sanitize edilir), en fazla 4; baslik/aciklama uzunluk sinirli.
export const buildDevtoPayload = ({ article, coverUrl, published }) => ({
  title: clip(article.articleTitle, DEVTO_MAX_TITLE),
  body_markdown: article.articleBodyMarkdown,
  published: Boolean(published),
  tags: normalizeTags(article.articleTags).slice(0, DEVTO_MAX_TAGS),
  ...(coverUrl ? { main_image: coverUrl } : {}),
  ...(article.articleSummary ? { description: clip(article.articleSummary, DEVTO_MAX_DESCRIPTION) } : {}),
});

// Medium'a manuel aktarma baglantisi (Medium'un yeni entegrasyon tokeni vermemesi nedeniyle tek yol).
export const mediumImportUrl = (liveUrl) => `https://medium.com/p/import?url=${encodeURIComponent(liveUrl)}`;

export const isMediumUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && (u.hostname === 'medium.com' || u.hostname.endsWith('.medium.com'));
  } catch {
    return false;
  }
};
