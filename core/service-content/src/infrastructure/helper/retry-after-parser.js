// dev.to 429 yanitindaki Retry-After header'i bazen integer saniye, bazen RFC 7231 HTTP-date string'i olur.
// parseInt tek basina kullanilirsa tarih durumunda NaN doner ve hemen retry edilir — bunu onlemek icin ikisini de dener.
export const parseRetryAfter = (headerValue) => {
  if (!headerValue) return null;

  const asSeconds = Number(headerValue);
  if (!Number.isNaN(asSeconds)) return asSeconds * 1000;

  const asDate = new Date(headerValue);
  if (!Number.isNaN(asDate.getTime())) return Math.max(0, asDate.getTime() - Date.now());

  return null;
};
