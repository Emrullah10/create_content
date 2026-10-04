import { withAdvisoryLock } from './job-lock.js';

export const runPublishRetryJob = async (container) => withAdvisoryLock('publish-retry', async () => {
  const run = await container.repos.jobRunRepo.start('publish-retry');
  try {
    const results = await container.retryPublication();
    await container.repos.jobRunRepo.finish(run.id, { status: 'success', stats: { retried: results.length } });
    return results;
  } catch (err) {
    await container.repos.jobRunRepo.finish(run.id, { status: 'failed', error: err.message });
    console.error('[job:publish-retry]', err);
  }
});
