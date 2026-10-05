import { useQuery } from '@tanstack/react-query';
import api from '@api';
import { QK } from '@shared/constant/queryKeys';
import useApiMutation from '@hooks/useApiMutation';

// Calisan bir is varken 4 sn'de bir yoklar (is arka planda kosar).
export const useDashboard = () =>
  useQuery({
    queryKey: QK.dashboard,
    queryFn: api.getDashboard,
    refetchInterval: (q) => (q.state.data?.jobs?.some((j) => j.jobRunStatus === 'running') ? 4000 : false),
  });

export const useRunPipeline = () =>
  useApiMutation({ mutationFn: (topicCode) => api.runPipelineNow(topicCode), invalidate: [QK.dashboard, ['topics'], ['articles']], successKey: 'dashboard.started' });
