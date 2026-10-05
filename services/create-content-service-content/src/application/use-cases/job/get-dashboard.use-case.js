import { PERMISSIONS, requireCallerPermission } from 'app-shared';

// Dashboard: durum sayilari, son calismalar, aktif model/saglayici bilgisi. Yalniz okur.
export const makeGetDashboard = ({ articleRepo, topicRepo, jobRunRepo, describeLlm, isLlmConfigured, describePorts, config }) => async ({ caller } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentRead);
  const [articles, topics, jobs] = await Promise.all([articleRepo.countByStatus({}), topicRepo.countByStatus({}), jobRunRepo.latest({ limit: 10 })]);
  return {
    articles,
    topics,
    jobs,
    llm: { configured: isLlmConfigured(), roles: describeLlm() },
    ports: describePorts(),
    quality: { threshold: config.qualityThreshold, maxRounds: config.qualityMaxRounds, judgeSamples: config.judgeSamples },
    schedule: { dailyCron: config.dailyCron, timezone: config.timezone },
  };
};
