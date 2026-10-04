import { wrap } from 'app-shared';
import coreRoutes from '../../../core/service-content/routes/rest-routes.js';
import { themeCreateHandler, themeUpdateHandler, themeToggleHandler } from '../src/interfaces/http/index.js';

// Anahtarlar = OpenAPI `x-functionName`.
export default {
  ...coreRoutes,
  postThemeCreate: wrap(themeCreateHandler, { successStatus: 201 }),
  postThemeUpdate: wrap(themeUpdateHandler),
  postThemeToggle: wrap(themeToggleHandler),
};
