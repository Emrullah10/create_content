import { NotFoundError } from '../../../domain/errors/index.js';

export const makeRejectTopic = ({ topicRepo }) => async ({ topicId }) => {
  const topic = await topicRepo.findById(topicId);
  if (!topic) throw new NotFoundError('Topic', topicId);
  return topicRepo.update(topicId, { status: 'rejected' });
};
