import container from '../../container.js';

const uc = () => container.useCases.topic;

export const topicListHandler = (req, caller) => uc().list({ caller, status: req.query?.status, themeCode: req.query?.themeCode, limit: req.query?.limit, offset: req.query?.offset });
export const topicGenerateHandler = (req, caller) => uc().generate({ caller, themeCode: req.body?.themeCode, count: req.body?.count });
export const topicCreateHandler = (req, caller) => uc().create({ ...req.body, caller });
export const topicUpdateHandler = (req, caller) => uc().update({ ...req.body, topicCode: req.params?.topicCode, caller });
export const topicApproveHandler = (req, caller) => uc().approve({ topicCode: req.params?.topicCode, authorNote: req.body?.authorNote, caller });
export const topicRejectHandler = (req, caller) => uc().reject({ topicCode: req.params?.topicCode, caller });
