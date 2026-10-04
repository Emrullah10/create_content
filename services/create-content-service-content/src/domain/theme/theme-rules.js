import { DomainError } from '../errors/domain-error.js';

export const THEME_WEIGHT_MIN = 1;
export const THEME_WEIGHT_MAX = 10;

// "React, Node js" -> ['react','nodejs']; dev.to etiketleri kucuk harf ve tiresiz olmali (yayin oncesi tekrar sanitize edilir).
export const normalizeTags = (input) => {
  const list = Array.isArray(input) ? input : String(input ?? '').split(',');
  return [...new Set(list.map((t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean))].slice(0, 10);
};

export const validateThemeInput = ({ name, weight } = {}, { partial = false } = {}) => {
  if (!partial || name !== undefined) {
    if (!String(name ?? '').trim()) throw new DomainError('THEME_NAME_REQUIRED', 'name is required');
    if (String(name).length > 200) throw new DomainError('THEME_NAME_TOO_LONG', 'name must be at most 200 characters');
  }
  if (weight !== undefined && !(Number.isInteger(weight) && weight >= THEME_WEIGHT_MIN && weight <= THEME_WEIGHT_MAX)) {
    throw new DomainError('THEME_WEIGHT_INVALID', `weight must be an integer between ${THEME_WEIGHT_MIN} and ${THEME_WEIGHT_MAX}`);
  }
};
