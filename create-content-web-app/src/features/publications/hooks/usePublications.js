import { useQuery } from '@tanstack/react-query';
import api from '@api';
import { QK } from '@shared/constant/queryKeys';
import useApiMutation from '@hooks/useApiMutation';

export const usePublications = () => useQuery({ queryKey: QK.publications, queryFn: api.listPublications });
export const useSyncPublications = () => useApiMutation({ mutationFn: api.syncPublications, invalidate: [QK.publications, ['articles']], successKey: 'publications.synced' });
export const useRetryPublications = () => useApiMutation({ mutationFn: api.retryPublications, invalidate: [QK.publications, ['articles']], successKey: 'publications.retried' });
