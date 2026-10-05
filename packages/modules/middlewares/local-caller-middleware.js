import { IDENTITY_HEADERS, OPERATOR_CALLER } from 'app-shared';

// "Surec-ici gateway": istemcinin gonderdigi tum kimlik header'larini siler, sabit operator kimligini yazar.
// Auth eklendiginde yalnizca bu middleware oturum middleware'i ile degisir; asagisi ayni kalir.
export default () => (req, res, next) => {
  for (const name of IDENTITY_HEADERS) delete req.headers[name];
  req.headers.useraccountid = OPERATOR_CALLER.callerUserId;
  req.headers.useraccountrole = OPERATOR_CALLER.callerUserRole;
  req.headers.useraccounttenantcode = OPERATOR_CALLER.callerTenantCode;
  req.headers.useraccountorganizationid = OPERATOR_CALLER.callerOrganizationId;
  req.headers.useraccountpermissionlist = OPERATOR_CALLER.callerPermissionList.join(',');
  req.headers.useraccountip = req.socket?.remoteAddress || 'none';
  next();
};
