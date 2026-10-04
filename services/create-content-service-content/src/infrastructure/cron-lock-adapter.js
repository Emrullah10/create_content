import { makeWithCronLock } from 'app-shared';

// app-shared cron kilidi: Postgres advisory lock (tek, sabit baglanti). Container'da lazy: datasource'lar kurulmadan
// kilit kullanilmaz, cagri aninda `datasources` okunur.
export const makeCronLockForContainer = () => (key, ttlSeconds, fn) => makeWithCronLock()(key, ttlSeconds, fn);
