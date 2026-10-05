import dayjs from 'dayjs';

export const formatDateTime = (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-');

export const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return '-';
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

export const scoreColor = (score) => (score === null || score === undefined ? 'default' : score >= 75 ? 'success' : score >= 60 ? 'warning' : 'error');

// API hata kodu -> i18n anahtari. Cevirisi olmayan kod, backend'in ham mesajina duser.
export const apiErrorKey = (error) => {
  const code = error?.response?.data?.error?.code;
  return code ? `apiErrors.${code}` : null;
};
export const apiErrorMessage = (error, t) => {
  const key = apiErrorKey(error);
  const raw = error?.response?.data?.error?.message || error?.message || '';
  return key && t(key, { defaultValue: '' }) ? t(key, { defaultValue: raw }) : raw || t('apiErrors.UNKNOWN');
};

export const splitTags = (value) => String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
