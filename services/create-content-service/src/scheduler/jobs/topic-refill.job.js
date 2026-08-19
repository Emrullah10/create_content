import { withAdvisoryLock } from './job-lock.js';

// approved konu sayisi TOPIC_QUEUE_MIN'in altindaysa her aktif tema icin AI'dan yeni basliklar uretir.
export const runTopicRefillJob = async (container) => withAdvisoryLock('topic-refill', async () => {
  const run = await container.repos.jobRunRepo.start('topic-refill');
  try {
    const approved = await container.repos.topicRepo.list({ status: 'approved' });
    if (approved.length >= container.contentConfig.topicQueueMin) {
      await container.repos.jobRunRepo.finish(run.id, { status: 'success', stats: { skipped: true, approvedCount: approved.length } });
      return { skipped: true };
    }

    const themes = await container.listThemes({ activeOnly: true });
    const created = [];
    for (const theme of themes) {
      const topics = await container.generateTopics({ themeId: theme.id, count: 10 });
      created.push(...topics);
    }

    await container.repos.jobRunRepo.finish(run.id, { status: 'success', stats: { createdCount: created.length } });
    return { createdCount: created.length };
  } catch (err) {
    await container.repos.jobRunRepo.finish(run.id, { status: 'failed', error: err.message });
    console.error('[job:topic-refill]', err);
  }
});
