import cron from 'node-cron';
import { contentConfig } from '@create-content/config';
import { runDailyContentJob } from './jobs/daily-content.job.js';
import { runTopicRefillJob } from './jobs/topic-refill.job.js';
import { runPublishRetryJob } from './jobs/publish-retry.job.js';

export const startScheduler = (container) => {
  cron.schedule(contentConfig.dailyCron, () => runDailyContentJob(container));
  cron.schedule('0 3 * * 1', () => runTopicRefillJob(container));
  cron.schedule('*/15 * * * *', () => runPublishRetryJob(container));

  console.log(`[scheduler] daily-content cron: "${contentConfig.dailyCron}"`);
};
