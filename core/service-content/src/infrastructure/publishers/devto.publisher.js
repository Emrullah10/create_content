// dev.to (Forem API v1) publisher.
// Arastirmayla dogrulanan 4 sessiz tuzak burada ele alinir:
// 1) accept: application/vnd.forem.api-v1+json yoksa eski (v0) alan adlari doner
// 2) auth Authorization: Bearer degil, api-key header'i
// 3) tag'ler sessizce lowercase + tiresiz slug'a cevrilir -> gonderim oncesi biz de sanitize ederiz
// 4) 429 Retry-After bazen saniye, bazen RFC 7231 tarih string'i -> parseRetryAfter ikisini de cozer
import axios from 'axios';
import { sanitizeTagsForDevto } from '../../domain/policies/tag-policy.js';
import { parseRetryAfter } from '../helper/retry-after-parser.js';
import { makeRateLimiter } from '../helper/rate-limiter.js';
import { withRetry } from '../helper/retry.js';

export const makeDevtoPublisher = ({ apiKey, publishMode = 'draft' }) => {
  const http = axios.create({
    baseURL: 'https://dev.to/api',
    headers: {
      'api-key': apiKey,
      'accept': 'application/vnd.forem.api-v1+json',
      'content-type': 'application/json',
    },
  });

  const rateLimiter = makeRateLimiter({ maxRequests: 10, windowMs: 30_000 });

  return {
    isAvailable: async () => Boolean(apiKey),

    publish: async (article) => {
      await rateLimiter.acquire();

      const body = {
        article: {
          title: article.title,
          body_markdown: article.bodyMarkdown,
          published: publishMode === 'live',
          description: article.summary,
          tags: sanitizeTagsForDevto(article.tags ?? []),
          main_image: article.coverImageUrl ?? null,
        },
      };

      const doRequest = async () => {
        try {
          const { data } = await http.post('/articles', body);
          return { externalId: String(data.id), externalUrl: data.url, status: publishMode === 'live' ? 'published' : 'draft' };
        } catch (err) {
          if (err.response?.status === 429) {
            const waitMs = parseRetryAfter(err.response.headers['retry-after']) ?? 30_000;
            await new Promise((r) => setTimeout(r, waitMs));
          }
          throw err;
        }
      };

      return withRetry(doRequest, { attempts: 3 });
    },
  };
};
