import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { DomainError } from '../../../domain/errors/domain-error.js';
import { slugify } from '../../../domain/article/markdown.js';

// Pipeline'i bir job_run kaydi + Postgres advisory kilidi icinde calistirir. HTTP'den tetiklenince ARKA PLANDA kosar (istek
// beklemez; panel durumu yoklar), cron'dan `wait:true` ile beklenir. Ayni anda tek makale yazilir (kilit).
export const makeRunPipelineJob = ({ pipeline, topicRepo, articleRepo, jobRunRepo, withLock, isLlmConfigured, logger = console }) => {
  for (const [n, d] of Object.entries({ pipeline, topicRepo, articleRepo, jobRunRepo, withLock, isLlmConfigured })) if (!d) throw new Error(`makeRunPipelineJob requires { ${n} }`);

  const execute = async ({ jobName, jobRunId, lockKey, work }) => {
    let outcome = null;
    try {
      const locked = await withLock(lockKey, 60 * 60, async () => {
        outcome = await work();
        return outcome;
      });
      if (locked === null && outcome === null) {
        await jobRunRepo.finish({ jobRunId, status: 'skipped', stats: { reason: 'another pipeline is already running' } });
        return { status: 'skipped', reason: 'busy' };
      }
      const failed = outcome.ok === false;
      await jobRunRepo.finish({ jobRunId, status: outcome.skipped ? 'skipped' : failed ? 'failed' : 'succeeded', stats: outcome, error: failed ? outcome.error : null });
      return outcome;
    } catch (error) {
      logger.error?.(`[job:${jobName}] ${error.message}`);
      await jobRunRepo.finish({ jobRunId, status: 'failed', stats: { error: error.message }, error: error.message });
      return { ok: false, error: error.message };
    }
  };

  const guard = (caller) => {
    requireCallerPermission(caller, PERMISSIONS.contentRun);
    if (!isLlmConfigured()) throw new DomainError('LLM_NOT_CONFIGURED', 'No LLM is configured. Set LLM_WRITER_* in .env and restart the service.');
  };
  const launch = async ({ jobName, lockKey, work, wait }) => {
    const job = await jobRunRepo.start({ jobName });
    const done = execute({ jobName, jobRunId: job.jobRunId, lockKey, work });
    if (wait) return { jobRunId: job.jobRunId, ...(await done) };
    done.catch(() => {});
    return { jobRunId: job.jobRunId, status: 'running' };
  };

  return {
    // Siradaki (veya verilen) onayli konudan yeni makale yazar.
    runDaily: async ({ caller, topicCode, wait = false } = {}) => {
      guard(caller);
      return launch({
        jobName: 'daily-content',
        lockKey: 'job:content-pipeline',
        wait,
        work: async () => {
          const topic = topicCode
            ? await topicRepo.transition({ topicCode, from: ['approved'], to: 'drafting', userId: caller.callerUserId })
            : await topicRepo.claimNextApproved({ userId: caller.callerUserId });
          if (!topic) return { ok: true, skipped: true, reason: topicCode ? 'topic is not in approved status' : 'no approved topic in the queue' };
          let article;
          try {
            article = await articleRepo.insert({ topicId: topic.topicId, title: topic.topicTitle, slug: slugify(topic.topicTitle), userId: caller.callerUserId });
          } catch (error) {
            // Makale hic olusmadi: konu `drafting`te asili kalmasin.
            await topicRepo.transition({ topicCode: topic.topicCode, from: ['drafting'], to: 'approved' });
            throw error;
          }
          const result = await pipeline.run({ articleId: article.articleId });
          return { topicCode: topic.topicCode, articleCode: article.articleCode, ...result, results: result.results?.map(({ stage, ms }) => ({ stage, ms })) };
        },
      });
    },

    // Basarisiz/yarim kalan makaleyi KALDIGI ASAMADAN surdurur.
    resumeArticle: async ({ caller, articleCode, wait = false } = {}) => {
      guard(caller);
      if (!articleCode) throw new DomainError('ARTICLE_CODE_REQUIRED', 'articleCode is required');
      const article = await articleRepo.findByCode({ articleCode });
      if (!article) throw new DomainError('ARTICLE_NOT_FOUND', 'article not found');
      if (!['failed', 'drafting'].includes(article.articleStatus)) throw new DomainError('ARTICLE_NOT_RESUMABLE', `only failed or drafting articles can be resumed (status: ${article.articleStatus})`);
      return launch({ jobName: 'resume-article', lockKey: 'job:content-pipeline', wait, work: async () => ({ articleCode, ...(await pipeline.run({ articleId: article.articleId })) }) });
    },
  };
};
