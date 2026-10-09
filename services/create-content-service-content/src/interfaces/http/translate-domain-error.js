import OpenAI from 'openai';
import { badRequest, conflict, notFound, serverError, serviceUnavailable } from 'app-shared';
import { DomainError } from '../../domain/errors/domain-error.js';
import { InfrastructureError } from '../../domain/errors/infrastructure-error.js';

// DomainError.code -> HTTP fabrikasi. Haritada olmayan kod 400'e duser
// (DomainError = istemcinin duzeltebilecegi is kurali ihlali).
// Yeni kod UC YERE birlikte eklenir: firlatma noktasi, bu harita, web i18n apiErrors.<KOD>.
export const CODE_TO_FACTORY = Object.freeze({
  // theme
  THEME_NOT_FOUND: notFound,
  THEME_CODE_REQUIRED: badRequest,
  THEME_NAME_REQUIRED: badRequest,
  THEME_NAME_TOO_LONG: badRequest,
  THEME_WEIGHT_INVALID: badRequest,
  THEME_IS_ACTIVE_REQUIRED: badRequest,
  THEME_NOTHING_TO_UPDATE: badRequest,
  // topic
  TOPIC_NOT_FOUND: notFound,
  TOPIC_CODE_REQUIRED: badRequest,
  TOPIC_TITLE_REQUIRED: badRequest,
  TOPIC_TITLE_TOO_LONG: badRequest,
  TOPIC_STATUS_INVALID: badRequest,
  TOPIC_NOTHING_TO_UPDATE: badRequest,
  TOPIC_ALREADY_EXISTS: conflict,
  TOPIC_NOT_APPROVABLE: conflict,
  TOPIC_NOT_REJECTABLE: conflict,
  TOPIC_LOCKED: conflict,
  TOPIC_QUEUE_FULL: conflict,
  // article
  ARTICLE_NOT_FOUND: notFound,
  ARTICLE_CODE_REQUIRED: badRequest,
  ARTICLE_NOTHING_TO_UPDATE: badRequest,
  ARTICLE_TITLE_REQUIRED: badRequest,
  ARTICLE_BODY_REQUIRED: badRequest,
  ARTICLE_NOT_EDITABLE: conflict,
  ARTICLE_NEEDS_ASSETS: conflict,
  ARTICLE_BELOW_THRESHOLD: conflict,
  ARTICLE_NOT_APPROVABLE: conflict,
  ARTICLE_NOT_RETRYABLE: conflict,
  ARTICLE_NOT_DELETABLE: conflict,
  ARTICLE_NOT_RESUMABLE: conflict,
  ARTICLE_NOT_IMPROVABLE: conflict,
  ARTICLE_NOT_DRAFTING: conflict,
  // yayin
  PUBLISH_MODE_INVALID: badRequest,
  ARTICLE_NOT_PUBLISHABLE: conflict,
  ARTICLE_NOT_PUBLISHED: conflict,
  MEDIUM_URL_INVALID: badRequest,
  PUBLISH_FAILED: serviceUnavailable,
  // pipeline / altyapi (503 = yapilandirma eksik, tekrar denenebilir)
  LLM_NOT_CONFIGURED: serviceUnavailable,
  PORT_NOT_CONFIGURED: serviceUnavailable,
});

const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';

export const toHttpError = (err) => {
  if (err instanceof DomainError) {
    const factory = CODE_TO_FACTORY[err.code] || badRequest;
    return factory(err.code, err.message, err.details);
  }
  if (err instanceof InfrastructureError) return (CODE_TO_FACTORY[err.code] || serverError)(err.code || 'INTERNAL_ERROR', err.message);
  // LLM saglayicisi (NVIDIA vb.) 5xx/429/zaman asimi/baglanti hatasi: genel 500 yerine aciklayici 503 (tekrar denenebilir).
  if (err instanceof OpenAI.OpenAIError) return serviceUnavailable('LLM_UPSTREAM_FAILED', `LLM provider error${err.status ? ` (HTTP ${err.status})` : ''}: ${err.message}`.slice(0, 300));
  if (err?.code === PG_UNIQUE_VIOLATION) return conflict('ALREADY_EXISTS', 'A record with the same unique value already exists');
  if (err?.code === PG_FK_VIOLATION) return badRequest('REFERENCE_NOT_FOUND', 'Referenced record does not exist');
  return err;
};

export const wrapWithHttpTranslation =
  (fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      throw toHttpError(err);
    }
  };

export default { toHttpError, wrapWithHttpTranslation };
