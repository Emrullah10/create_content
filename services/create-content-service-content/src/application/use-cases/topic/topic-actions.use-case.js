import { PERMISSIONS, requireCallerPermission } from 'app-shared';
import { DomainError } from '../../../domain/errors/domain-error.js';
import { validateTopicInput } from '../../../domain/topic/topic-rules.js';
import { normalizeTags } from '../../../domain/theme/theme-rules.js';

const need = (v, code, msg) => {
  if (!v) throw new DomainError(code, msg);
};

// Elle konu: kullanici kendi yazdigi icin dogrudan `approved` (acik niyet); `status:'suggested'` ile onaya birakilabilir.
export const makeCreateTopic = ({ topicRepo, themeRepo }) => async ({ caller, themeCode, title, angle, keywords, authorNote, status = 'approved' } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentManage);
  need(themeCode, 'THEME_CODE_REQUIRED', 'themeCode is required');
  validateTopicInput({ title });
  if (!['approved', 'suggested'].includes(status)) throw new DomainError('TOPIC_STATUS_INVALID', 'status must be approved or suggested');
  const theme = await themeRepo.findByCode({ themeCode });
  need(theme, 'THEME_NOT_FOUND', 'theme not found');
  const row = await topicRepo.insert({ themeId: theme.themeId, title, angle, keywords: normalizeTags(keywords), authorNote, status, source: 'manual', userId: caller.callerUserId });
  if (!row) throw new DomainError('TOPIC_ALREADY_EXISTS', 'a topic with the same title already exists');
  return row;
};

// Onay: yazar notu burada girilir (ozgunluk icin en etkili girdi). suggested veya rejected -> approved.
export const makeApproveTopic = ({ topicRepo, nowFn = () => new Date() }) => async ({ caller, topicCode, authorNote } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentManage);
  need(topicCode, 'TOPIC_CODE_REQUIRED', 'topicCode is required');
  const row = await topicRepo.transition({ topicCode, from: ['suggested', 'rejected'], to: 'approved', authorNote: authorNote?.trim() || undefined, userId: caller.callerUserId, now: nowFn() });
  if (!row) throw new DomainError('TOPIC_NOT_APPROVABLE', 'topic does not exist or is not in suggested/rejected status');
  return row;
};

export const makeRejectTopic = ({ topicRepo, nowFn = () => new Date() }) => async ({ caller, topicCode } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentManage);
  need(topicCode, 'TOPIC_CODE_REQUIRED', 'topicCode is required');
  const row = await topicRepo.transition({ topicCode, from: ['suggested', 'approved'], to: 'rejected', userId: caller.callerUserId, now: nowFn() });
  if (!row) throw new DomainError('TOPIC_NOT_REJECTABLE', 'topic does not exist or is not in suggested/approved status');
  return row;
};

// Yazim baslamis (drafting/used) konu duzenlenemez.
export const makeUpdateTopic = ({ topicRepo, nowFn = () => new Date() }) => async ({ caller, topicCode, ...body } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentManage);
  need(topicCode, 'TOPIC_CODE_REQUIRED', 'topicCode is required');
  const current = await topicRepo.findByCode({ topicCode });
  need(current, 'TOPIC_NOT_FOUND', 'topic not found');
  if (['drafting', 'used'].includes(current.topicStatus)) throw new DomainError('TOPIC_LOCKED', 'a topic being written or already used cannot be edited');
  const patch = Object.fromEntries(['title', 'angle', 'keywords', 'authorNote'].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  need(Object.keys(patch).length, 'TOPIC_NOTHING_TO_UPDATE', 'no updatable field provided');
  if (patch.title !== undefined) validateTopicInput({ title: patch.title });
  if (patch.keywords !== undefined) patch.keywords = normalizeTags(patch.keywords);
  return topicRepo.update({ topicCode, patch, userId: caller.callerUserId, now: nowFn() });
};

export const makeListTopics = ({ topicRepo }) => async ({ caller, status, themeCode, limit, offset } = {}) => {
  requireCallerPermission(caller, PERMISSIONS.contentRead);
  const [items, counts] = await Promise.all([topicRepo.list({ status, themeCode, limit: Math.min(Number(limit) || 100, 500), offset: Number(offset) || 0 }), topicRepo.countByStatus({})]);
  return { items, counts };
};
