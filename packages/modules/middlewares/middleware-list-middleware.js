import localGuard from './local-guard-middleware.js';
import localCaller from './local-caller-middleware.js';
import bodyParser from './body-parser-middleware.js';
import compression from './compression-middleware.js';
import helmet from './helmet-middleware.js';
import logMiddleware from './log-middleware.js';

// Sira onemli: once host/origin korumasi, sonra sabit operator kimligi, sonra govde ayristirma.
export default [localGuard, localCaller, bodyParser, compression, helmet, logMiddleware];
