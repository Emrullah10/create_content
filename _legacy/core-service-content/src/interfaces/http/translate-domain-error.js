import { handleErrors } from '@create-content/errors';

export const translateDomainError = (res, err, callerName) => handleErrors(res, err, callerName);
