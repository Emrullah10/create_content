import { createAppConfig } from 'app-config';
import datasources, { createDatasources } from 'app-datasource';
import rawAppConfig from '../../../../services/create-content-service-content/configs/app-config.js';
import rawDatasourceConfig from '../configs/datasource-config.js';

// Her test dosyasi kendi modul kayit defterine sahiptir; appConfig + datasource'lar burada kurulur.
export const bootServiceTest = async () => {
  process.env.NODE_ENV = 'test';
  const appConfig = createAppConfig(rawAppConfig, rawDatasourceConfig);
  await createDatasources(appConfig);
  return appConfig;
};

export const shutdownServiceTest = async () => {
  for (const ds of Object.values(datasources)) {
    if (ds?.disconnect) await ds.disconnect().catch(() => {});
    else if (ds?.end) await ds.end().catch(() => {});
  }
};

export const HOST = { Host: '127.0.0.1:3100' };
