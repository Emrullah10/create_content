import { withAdvisoryLock } from './job-lock.js';

export const runDailyContentJob = async (container) => withAdvisoryLock('daily-content', async () => {
  const run = await container.repos.jobRunRepo.start('daily-content');
  try {
    const result = await container.dailyContentOrchestrator();
    await container.repos.jobRunRepo.finish(run.id, { status: 'success', stats: result });
    return result;
  } catch (err) {
    await container.repos.jobRunRepo.finish(run.id, { status: 'failed', error: err.message });
    console.error('[job:daily-content]', err);
  }
});
