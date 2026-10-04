import { badRequest, conflict, forbidden, notFound, serverError } from 'app-shared';
import { DomainError } from '../../domain/errors/domain-error.js';
import { InfrastructureError } from '../../domain/errors/infrastructure-error.js';

// DomainError.code -> HTTP fabrikasi. Haritada olmayan kod 400'e duser
// (DomainError = istemcinin duzeltebilecegi is kurali ihlali).
// Yeni kod UC YERE birlikte eklenir: firlatma noktasi, bu harita, web i18n apiErrors.<KOD>.
const CODE_TO_FACTORY = Object.freeze({
  THEME_NOT_FOUND: notFound,
  THEME_CODE_REQUIRED: badRequest,
  THEME_NAME_REQUIRED: badRequest,
  THEME_NAME_TOO_LONG: badRequest,
  THEME_WEIGHT_INVALID: badRequest,
  THEME_IS_ACTIVE_REQUIRED: badRequest,
  THEME_NOTHING_TO_UPDATE: badRequest,
});

const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';

export const toHttpError = (err) => {
  if (err instanceof DomainError) {
    const factory = CODE_TO_FACTORY[err.code] || badRequest;
    return factory(err.code, err.message, err.details);
  }
  if (err instanceof InfrastructureError) return serverError(err.code || 'INTERNAL_ERROR', err.message);
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
