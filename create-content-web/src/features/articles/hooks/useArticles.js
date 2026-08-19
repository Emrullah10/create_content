import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listArticles, getArticle, updateArticle, approveArticle } from '@api/articles';
import { publishArticle } from '@api/publications';
import { queryKeys } from '@shared/constant/query-keys';

export const useArticles = (status) => useQuery({ queryKey: queryKeys.articles(status), queryFn: () => listArticles(status) });

export const useArticle = (id) => useQuery({ queryKey: queryKeys.article(id), queryFn: () => getArticle(id), enabled: Boolean(id) });

export const useUpdateArticle = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch) => updateArticle(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.article(id) }),
  });
};

export const useApproveArticle = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveArticle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.article(id) }),
  });
};

export const usePublishArticle = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishArticle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.article(id) }),
  });
};
