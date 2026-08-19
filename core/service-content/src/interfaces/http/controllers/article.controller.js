export const makeArticleController = ({ getArticle, listArticles, updateArticle, approveArticle }) => ({
  get: (req) => getArticle({ articleId: req.params.id }),
  list: (req) => listArticles({ status: req.query.status }),
  update: (req) => updateArticle({ articleId: req.params.id, patch: req.body }),
  approve: (req, { qualityThreshold }) => approveArticle({ articleId: req.params.id, qualityThreshold }),
});
