// Retry-After bazen tam sayi saniye, bazen RFC 7231 HTTP-date olur. Yalniz Number() NaN verirdi.
export const parseRetryAfter = (headerValue) => {
  if (!headerValue) return null;
  const asSeconds = Number(headerValue);
  if (!Number.isNaN(asSeconds)) return asSeconds * 1000;
  const asDate = new Date(headerValue);
  if (!Number.isNaN(asDate.getTime())) return Math.max(0, asDate.getTime() - Date.now());
  return null;
};
