import container from '../../container.js';

const uc = () => container.useCases.pipeline;

// Arka planda baslar (202): panel dashboard/job durumunu yoklar.
export const pipelineRunHandler = async (req, caller) => ({ success: true, data: await uc().runDaily({ caller, topicCode: req.body?.topicCode }), __statusCode: 202 });
export const pipelineResumeHandler = async (req, caller) => ({ success: true, data: await uc().resumeArticle({ caller, articleCode: req.params?.articleCode }), __statusCode: 202 });
export const pipelineImproveHandler = async (req, caller) => ({ success: true, data: await uc().improveArticle({ caller, articleCode: req.params?.articleCode }), __statusCode: 202 });
export const dashboardHandler = (req, caller) => uc().dashboard({ caller });
