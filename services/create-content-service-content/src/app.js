import '../../../core/service-content/src/infrastructure/persistence/init-query-builder.js';
import express from 'express';
import createRouteBinder from 'app-route-binder';
import appConfig from 'app-config';
import datasources from 'app-datasource';
import middlewareFactory from '../middlewares/index.js';
import openApi from '../definitions/rest-api-definition.js';
import routes from '../routes/rest-routes.js';

// main.js ve testler AYNI baglamayi kullanir: testler uretim kablolamasini (localGuard, localCaller,
// route-binder) sinar, sahte header yazmaz.
export const buildApp = () => {
  const app = express();
  app.set('query parser', 'extended');
  const binder = createRouteBinder({ openApi, routes, appConfig, datasources });
  app.use(middlewareFactory(appConfig, binder, openApi));
  binder.bind(app);
  return app;
};
