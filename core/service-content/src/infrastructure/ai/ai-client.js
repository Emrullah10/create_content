// core/service-content/src/infrastructure/ai/ai-client.js
// create-content-ai (FastAPI) servisine HTTP uzerinden konusan AiPort implementasyonu.
// Gemini free-tier rate limitleri (ör. 10 istek/dakika) sik tetiklenir (429/503) —
// tum cagrilar withRetry ile sarilir, ustel geri cekilme ile.
import axios from 'axios';
import { withRetry } from '../helper/retry.js';

const isRetryable = (err) => {
  const status = err.response?.status;
  return status === 429 || status === 503 || !err.response;
};

const callWithRetry = (fn) => withRetry(fn, { attempts: 4, baseDelayMs: 5_000, shouldRetry: isRetryable });

export const makeAiClient = ({ baseUrl }) => {
  const http = axios.create({ baseURL: baseUrl, timeout: 120_000 });

  return {
    generateTopics: async (theme, existingTitles, count = 20) => {
      const { data } = await callWithRetry(() => http.post('/generate-topics', { theme, existing_titles: existingTitles, count }));
      return data.topics;
    },

    generateOutline: async (topic) => {
      const { data } = await callWithRetry(() => http.post('/outline', { topic }));
      return data;
    },

    draftArticle: async (topic, outline) => {
      const { data } = await callWithRetry(() => http.post('/draft', { topic, outline }));
      return {
        title: data.title,
        subtitle: data.subtitle,
        summary: data.summary,
        tags: data.tags,
        bodyMarkdown: data.body_markdown,
        diagrams: data.diagrams,
        coverPrompt: data.cover_prompt,
      };
    },

    critiqueAndRevise: async (article) => {
      const { data } = await callWithRetry(() => http.post('/critique', { article }));
      return { revised: { bodyMarkdown: data.body_markdown, summary: data.summary }, notes: data.notes };
    },

    scoreArticle: async (article) => {
      const { data } = await callWithRetry(() => http.post('/score', { article }));
      return { score: data.score, report: data.report };
    },

    generateCoverImage: async (prompt) => {
      const { data } = await callWithRetry(() => http.post('/cover', { prompt }, { responseType: 'arraybuffer' }));
      return Buffer.from(data);
    },
  };
};
