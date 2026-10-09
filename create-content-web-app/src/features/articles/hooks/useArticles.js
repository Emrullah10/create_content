import { useQuery } from '@tanstack/react-query';
import api from '@api';
import { QK } from '@shared/constant/queryKeys';
import useApiMutation from '@hooks/useApiMutation';

export const useArticles = (params) => useQuery({ queryKey: QK.articles(params), queryFn: () => api.listArticles(params), refetchInterval: (q) => (q.state.data?.counts?.drafting ? 5000 : false) });

// Yazim suruyorsa (drafting) 4 sn'de bir yoklar.
export const useArticleDetail = (code) =>
  useQuery({ queryKey: QK.article(code), queryFn: () => api.getArticleDetail(code), refetchInterval: (q) => (q.state.data?.article?.articleStatus === 'drafting' ? 4000 : false) });

const refresh = (code) => [QK.article(code), ['articles', 'list'], QK.dashboard, ['topics']];

export const useUpdateArticle = (code, { onDone } = {}) => useApiMutation({ mutationFn: (body) => api.updateArticle(code, body), invalidate: refresh(code), successKey: 'common.saved', onSuccess: onDone });
export const useApproveArticle = (code, { onDone } = {}) => useApiMutation({ mutationFn: (override) => api.approveArticle(code, override), invalidate: refresh(code), successKey: 'articles.approvedMsg', onSuccess: onDone });
export const useRetryAssets = (code) => useApiMutation({ mutationFn: () => api.retryArticleAssets(code), invalidate: refresh(code), successKey: 'articles.assetsRetried' });
export const useResumeArticle = (code) => useApiMutation({ mutationFn: () => api.resumeArticle(code), invalidate: refresh(code), successKey: 'dashboard.started' });
export const useImproveArticle = (code) => useApiMutation({ mutationFn: () => api.improveArticle(code), invalidate: refresh(code), successKey: 'articles.improveStarted' });
export const useAbandonArticle = (code, { onDone } = {}) => useApiMutation({ mutationFn: (rewrite) => api.abandonArticle(code, rewrite), invalidate: refresh(code), successKey: 'articles.abandoned', onSuccess: onDone });
export const usePublishDevto = (code) => useApiMutation({ mutationFn: (mode) => api.publishToDevto(code, mode), invalidate: [...refresh(code), ['publications']], successKey: 'publishing.done' });
export const useConfirmMedium = (code) => useApiMutation({ mutationFn: (url) => api.confirmMediumImport(code, url), invalidate: [...refresh(code), ['publications']], successKey: 'common.saved' });
