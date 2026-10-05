import handleErrors from '../../../../packages/modules/errors/handleErrors.js';
import openApi from '../../definitions/rest-api-definition.js';
const { routeFunctionErrorHandler } = handleErrors;

export default async (req, res, next, callerName, serviceFunction) => {
  try {
    let { schemas } = openApi?.components || {};
    let responseProperties = schemas[callerName + 'Response'].properties;
    let response = Object.keys(responseProperties).reduce((acc, key) => {
      acc[key] = responseProperties[key].example;
      return acc;
    }, {});
    res.status(200).json(response);
  } catch (error) {
    routeFunctionErrorHandler({ callerName, path: req.path }, error, next);
  }
};
