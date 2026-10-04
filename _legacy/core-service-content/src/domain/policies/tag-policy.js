// dev.to tag'leri gonderim oncesi sessizce lowercase + tiresiz slug'a cevrilir.
// Bunu bilerek burada yapiyoruz ki DB'deki tag ile dev.to'daki gercek tag tutarli kalsin.

const MAX_TAGS = 4;

export const sanitizeTagForDevto = (tag) =>
  tag
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');

export const sanitizeTagsForDevto = (tags) =>
  [...new Set(tags.map(sanitizeTagForDevto).filter(Boolean))].slice(0, MAX_TAGS);
