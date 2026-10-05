// Izin katalogu — tek dogruluk kaynagi. Bicim: <alan>:<eylem>.
// OpenAPI tanimlari `requirePermission(PERMISSIONS.X)` ile `x-serviceDiscovery`
// annotation'i uretir; route-binder istek aninda caller izin listesiyle kesisimi kontrol eder.
// `'*'`: oturumu olan herkes (ANY_AUTHENTICATED).

export const PERMISSIONS = Object.freeze({
  contentRead: 'content:read',
  contentManage: 'content:manage',
  contentPublish: 'content:publish',
  contentRun: 'content:run',
});

export const requirePermission = (permissionCode) => ({
  'x-serviceDiscovery': [{ permissionList: permissionCode }],
});

export const requireInternal = () => ({ 'x-internal': true });

export const ANY_AUTHENTICATED = '*';

export const ROLES = Object.freeze({
  operator: 'operator',
  system: 'system',
});

export const ROLE_PERMISSIONS = Object.freeze({
  operator: Object.values(PERMISSIONS),
  system: Object.values(PERMISSIONS),
});
