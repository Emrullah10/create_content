import { PERMISSIONS, ROLES } from '../permissions.js';

// Gateway yok: tek kullanicili yerel arac. Kimlik header'lari middleware'de yazilir
// (middlewares/local-caller-middleware.js) ve getCaller ayni bicimi okur.
// Id 0 KULLANILMAZ: query-builder `!callerUserId` ile reddeder.
// 'none' sentineli: tenant/org kolonu yok, query-builder kapsam filtresi uygulamaz.
const NONE = 'none';

export const OPERATOR_CALLER = Object.freeze({
  callerUserId: '1',
  callerTenantCode: NONE,
  callerOrganizationId: NONE,
  callerUserRole: ROLES.operator,
  callerOrganizationType: null,
  callerSessionId: null,
  callerIp: null,
  callerPermissionList: Object.freeze(Object.values(PERMISSIONS)),
});

// Cron ve surec-ici cagrilar icin.
export const SYSTEM_CALLER = Object.freeze({
  ...OPERATOR_CALLER,
  callerUserId: '2',
  callerUserRole: ROLES.system,
});

export const IDENTITY_HEADERS = Object.freeze([
  'useraccountid', 'useraccounttenantcode', 'useraccountorganizationid',
  'useraccountrole', 'useraccountorganizationtype', 'useraccountsessionid',
  'useraccountip', 'useraccountpermissionlist', 'userid', 'tenantcode', 'organizationid',
]);
