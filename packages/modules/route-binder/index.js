import handleErrors from 'app-errors';
import { getCaller } from 'app-shared';

const { unRoutedRouteErrorHandler, routeFunctionErrorHandler, HTTP_STATUS } = handleErrors;
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// "/v1/x/{id}" -> "/v1/x/:id"
const toExpressPath = (p) => p.replace(/{([^}]+)}/g, ':$1');

// Ozgullugu yuksek yol once baglanir: ilk farkli segmentte sabit olan, parametreli ({x}) olandan once gelir.
// Aksi halde '/things/{id}' kayidi '/things/special' isteklerini golgeler. Fark yoksa kod birimi sirasi
// (host locale'i sirayi degistirmesin).
const isParam = (seg) => /^{.+}$/.test(seg);
const bySpecificity = (a, b) => {
  const sa = a.path.split('/');
  const sb = b.path.split('/');
  const n = Math.max(sa.length, sb.length);
  for (let i = 0; i < n; i += 1) {
    const x = sa[i];
    const y = sb[i];
    if (x === y) continue;
    if (x === undefined) return 1;
    if (y === undefined) return -1;
    if (isParam(x) !== isParam(y)) return isParam(x) ? 1 : -1;
    return x < y ? -1 : 1;
  }
  return 0;
};

const permissionsOf = (op) => {
  const hit = (op['x-serviceDiscovery'] || []).find((e) => e && e.permissionList);
  return hit ? String(hit.permissionList).split(',').map((s) => s.trim()).filter(Boolean) : [];
};

const makePermissionGate = (required) => (req, res, next) => {
  if (!required.length || required.includes('*')) return next();
  let caller;
  try {
    caller = getCaller(req.headers, false);
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Caller authentication required' } });
  }
  if (!required.some((code) => caller.callerPermissionList.includes(code))) {
    return res.status(403).json({ success: false, error: { code: 'PERMISSION_DENIED', message: `Required any of: ${required.join('|')}` } });
  }
  return next();
};

export default function createRouteBinder({ openApi, routes, appConfig, datasources }) {
  const basePath = appConfig.basePath || '';
  const basePathPrefix = appConfig.basePathPrefix || '';
  const mount = `${basePathPrefix}${basePath}`;

  const createOpenApiDoc = () => {
    openApi.info.title = appConfig.name;
    openApi.info.description = appConfig.description;
    openApi.servers = [{ url: `${appConfig.url}${mount}` }];
    return openApi;
  };

  const operations = [];
  for (const [routePath, item] of Object.entries(openApi.paths || {})) {
    for (const method of METHODS) {
      const op = item?.[method];
      if (!op) continue;
      operations.push({
        path: routePath,
        method,
        functionName: op['x-functionName'],
        permissions: permissionsOf(op),
        internal: op['x-internal'] === true,
      });
    }
  }

  const health = async (req, res, next) => {
    try {
      const result = { name: appConfig.name, isOnline: true, time: new Date(), datasources: [] };
      for (const [name, ds] of Object.entries(datasources || {})) {
        if (!ds?.health) continue;
        result.datasources.push({ name, health: await ds.health().catch((e) => ({ error: e.message })) });
      }
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      routeFunctionErrorHandler({ path: req.path }, error, next);
    }
  };

  const bind = (app) => {
    const missing = operations.filter((o) => typeof routes[o.functionName] !== 'function');
    if (missing.length) {
      throw new Error(
        `route-binder: handler bulunamayan x-functionName: ${missing.map((m) => `${m.method.toUpperCase()} ${m.path} -> ${m.functionName}`).join(', ')}`,
      );
    }
    app.get('/api/online', (req, res) => res.json(true));
    app.get(`${mount}/app/health`, health);
    app.get(`${mount}/app/info`, (req, res) =>
      res.json({ name: appConfig.name, version: appConfig.version, routeCount: operations.length }),
    );
    for (const o of [...operations].sort(bySpecificity)) {
      const gate = o.internal ? (req, res) => res.status(401).json({ success: false, error: { code: 'INTERNAL_ENDPOINT_BLOCKED', message: 'internal' } }) : makePermissionGate(o.permissions);
      app[o.method](`${mount}${toExpressPath(o.path)}`, gate, routes[o.functionName]);
    }
    unRoutedRouteErrorHandler(app);
  };

  return { openApiDoc: openApi, createOpenApiDoc, operations, bind, setAllServiceApis: bind };
}
