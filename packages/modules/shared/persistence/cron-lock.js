import datasources from 'app-datasource';

// Postgres advisory lock: tek ve sabit bir baglantida alinip birakilir
// (pool.query iki ayri baglantiya dusebilir, unlock basarisiz olur ve kilit sizar).
// Surec cokerse baglanti kapanir ve kilit kendiliginden duser, bu yuzden TTL gerekmez;
// ttlSeconds yalnizca "isin suresi asildi" uyarisi icindir. Redis'siz surumun imzasi aynidir.
// ⚠️ Bu baglantida BEGIN YAPMA: idle_in_transaction_session_timeout oturumu oldurur.
export const makeWithCronLock =
  (ds = datasources, logger = console, { dbName = 'coreAppDb' } = {}) =>
  async (key, ttlSeconds, fn) => {
    const pool = ds?.[dbName]?.getPool?.();
    if (!pool) return fn();
    let client;
    try {
      client = await pool.connect();
    } catch (e) {
      logger.warn?.(`[cron-lock] ${key}: ${e.message}`);
      return fn();
    }
    let ok = false;
    try {
      const res = await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS ok', [key]);
      ok = res.rows[0]?.ok === true;
    } catch (e) {
      client.release();
      logger.warn?.(`[cron-lock] ${key}: ${e.message}`);
      return fn();
    }
    if (!ok) {
      client.release();
      logger.warn?.(`[cron-lock] ${key} busy, skipped`);
      return null;
    }
    const timer = setTimeout(
      () => logger.warn?.(`[cron-lock] ${key} exceeded ${ttlSeconds}s`),
      ttlSeconds * 1000,
    );
    timer.unref?.();
    try {
      return await fn();
    } finally {
      clearTimeout(timer);
      let failure;
      try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [key]);
      } catch (e) {
        failure = e;
      }
      client.release(failure);
    }
  };
