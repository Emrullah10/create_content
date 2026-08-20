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
  // AI servisindeki NVIDIA client timeout'u 150s — axios'un burada daha kisa bir
  // timeout'u olursa AI servisi hala calisirken Node erken vazgecip retry'i bosa harcar.
  const http = axios.create({ baseURL: baseUrl, timeout: 170_000 });

  return {
    generateTopics: async (theme, existingTitles, count = 20) => {
      const { data } = await callWithRetry(() => http.post('/generate-topics', { theme, existing_titles: existingTitles, count }));
      return data.topics;
    },

    generateOutline: async (topic, expertiseNotes = null) => {
      const { data } = await callWithRetry(() => http.post('/outline', { topic, expertise_notes: expertiseNotes }));
      return data;
    },

    draftArticle: async (topic, outline, expertiseNotes = null) => {
      const { data } = await callWithRetry(() => http.post('/draft', { topic, outline, expertise_notes: expertiseNotes }));
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

    expandArticle: async (article, currentWordCount, expertiseNotes = null) => {
      const { data } = await callWithRetry(() => http.post('/expand', { article, current_word_count: currentWordCount, expertise_notes: expertiseNotes }));
      return { bodyMarkdown: data.body_markdown, summary: data.summary };
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
