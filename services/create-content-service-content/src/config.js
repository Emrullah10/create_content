// Icerik ayarlari. Env CAGRI ANINDA okunur (modul duzeyinde sabitlenmez); varsayilanlar burada.
const int = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

export const readContentConfig = (env = process.env) => ({
  qualityThreshold: int(env.QUALITY_THRESHOLD, 75),
  qualityMaxRounds: int(env.QUALITY_MAX_ROUNDS, 2),
  judgeSamples: int(env.JUDGE_SAMPLES, 3),
  topicSuggestedMax: int(env.TOPIC_SUGGESTED_MAX, 15),
  dailyCron: env.DAILY_CRON || '0 6 * * *',
  timezone: env.TZ_CRON || 'Europe/Istanbul',
  thresholds: {
    minWords: int(env.ARTICLE_MIN_WORDS, 1400),
    maxWords: int(env.ARTICLE_MAX_WORDS, 2800),
    minCodeBlocks: int(env.ARTICLE_MIN_CODE_BLOCKS, 3),
    minDiagrams: int(env.ARTICLE_MIN_DIAGRAMS, 2),
  },
});
