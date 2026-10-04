// PostgreSQL pg_try_advisory_lock ile ayni job'un ust uste binmesini engeller.
// Job adindan sabit bir integer key uretilir (hashCode benzeri basit bir yontem).
import datasource from '@create-content/datasource';

const lockKeyFor = (jobName) => {
  let hash = 0;
  for (let i = 0; i < jobName.length; i++) {
    hash = (hash * 31 + jobName.charCodeAt(i)) | 0;
  }
  return hash;
};

export const withAdvisoryLock = async (jobName, fn) => {
  const key = lockKeyFor(jobName);
  const { rows } = await datasource.query('SELECT pg_try_advisory_lock($1) AS acquired', [key]);

  if (!rows[0].acquired) {
    console.log(`[job-lock] "${jobName}" already running, skipped`);
    return { skipped: true };
  }

  try {
    return await fn();
  } finally {
    await datasource.query('SELECT pg_advisory_unlock($1)', [key]);
  }
};
