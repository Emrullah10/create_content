import container from '../../container.js';

const uc = () => container.useCases.article;

export const articleListHandler = (req, caller) => uc().list({ caller, status: req.query?.status, limit: req.query?.limit, offset: req.query?.offset });
export const articleGetHandler = (req, caller) => uc().get({ caller, articleCode: req.params?.articleCode });
export const articleUpdateHandler = (req, caller) => uc().update({ ...req.body, articleCode: req.params?.articleCode, caller });
export const articleApproveHandler = (req, caller) => uc().approve({ articleCode: req.params?.articleCode, override: req.body?.override === true, caller });
export const articleRetryAssetsHandler = (req, caller) => uc().retryAssets({ articleCode: req.params?.articleCode, caller });
export const articleAbandonHandler = (req, caller) => uc().abandon({ articleCode: req.params?.articleCode, rewrite: req.body?.rewrite === true, caller });
