import container from '../../container.js';

const uc = () => container.useCases.publication;

export const publicationListHandler = (req, caller) => uc().list({ caller, limit: req.query?.limit });
export const publishToDevtoHandler = (req, caller) => uc().publishToDevto({ caller, articleCode: req.params?.articleCode, mode: req.body?.mode });
export const confirmMediumImportHandler = (req, caller) => uc().confirmMediumImport({ caller, articleCode: req.params?.articleCode, mediumUrl: req.body?.mediumUrl });
export const retryPublicationsHandler = (req, caller) => uc().retryFailed({ caller });
