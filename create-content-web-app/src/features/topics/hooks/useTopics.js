import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import http from '@shared/axios/http';
import { generateTopics, approveTopic, rejectTopic } from '@api/topics';
import { queryKeys } from '@shared/constant/query-keys';

export const useTopics = (status) => useQuery({
  queryKey: queryKeys.topics(status),
  queryFn: async () => (await http.get('/topics', { params: { status } })).data,
});

export const useGenerateTopics = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ themeId, count }) => generateTopics(themeId, count),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics'] }),
  });
};

export const useApproveTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveTopic,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics'] }),
  });
};

export const useRejectTopic = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectTopic,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics'] }),
  });
};
