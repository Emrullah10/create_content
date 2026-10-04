/* eslint-disable no-restricted-syntax */
/* eslint-disable global-require */
import middlewareFactoryList from './middleware-list-middleware.js';
import swaggerMiddleware from './swagger-middleware.js';

export default function middlewareFactory(config, routeBinder, openApi) {
  const middleWares = middlewareFactoryList.map((factory) => factory(config));
  if (!routeBinder) {
    return middleWares;
  }

  const swaggerDocument = routeBinder.createOpenApiDoc(openApi);
  middleWares.push(swaggerMiddleware(swaggerDocument));

  return middleWares;
}
