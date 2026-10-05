import { useQuery } from '@tanstack/react-query';
import api from '@api';
import { QK } from '@shared/constant/queryKeys';
import useApiMutation from '@hooks/useApiMutation';

export const useTopics = (params) => useQuery({ queryKey: QK.topics(params), queryFn: () => api.listTopics(params) });

const invalidateAll = [['topics'], QK.dashboard];

export const useGenerateTopics = () => useApiMutation({ mutationFn: api.generateTopics, invalidate: invalidateAll, successKey: 'topics.generated' });
export const useCreateTopic = ({ onDone } = {}) => useApiMutation({ mutationFn: api.createTopic, invalidate: invalidateAll, successKey: 'common.saved', onSuccess: onDone });
export const useApproveTopic = ({ onDone } = {}) => useApiMutation({ mutationFn: ({ topicCode, authorNote }) => api.approveTopic(topicCode, authorNote), invalidate: invalidateAll, successKey: 'topics.approved', onSuccess: onDone });
export const useRejectTopic = () => useApiMutation({ mutationFn: api.rejectTopic, invalidate: invalidateAll });
export const useUpdateTopic = ({ onDone } = {}) => useApiMutation({ mutationFn: ({ topicCode, ...body }) => api.updateTopic(topicCode, body), invalidate: invalidateAll, successKey: 'common.saved', onSuccess: onDone });
