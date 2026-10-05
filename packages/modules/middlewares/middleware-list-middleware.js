import localGuard from './local-guard-middleware.js';
import localCaller from './local-caller-middleware.js';
import bodyParser from './body-parser-middleware.js';
import panelAuth from './panel-auth-middleware.js';
import compression from './compression-middleware.js';
import helmet from './helmet-middleware.js';
import logMiddleware from './log-middleware.js';

// Sira onemli: once host/origin korumasi, sonra sabit operator kimligi, sonra govde ayristirma, sonra panel girisi (PANEL_PASSWORD varsa).
export default [localGuard, localCaller, bodyParser, panelAuth, compression, helmet, logMiddleware];
