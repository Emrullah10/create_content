export const makePublicationController = ({ publishOrchestrator, retryPublication }) => ({
  publish: (req) => publishOrchestrator({ articleId: req.params.articleId }),
  retry: () => retryPublication(),
});
