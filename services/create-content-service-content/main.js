import datasources, { createDatasources } from 'app-datasource';
import appConfig, { createAppConfig } from 'app-config';
import helper from 'app-helper';
import rawAppConfig from './configs/app-config.js';

// Test ortaminda datasource config test/ altindan okunur (adi sabit: klasor adi servis adindan farkli).
const datasourceConfigPath =
  process.env.NODE_ENV === 'test'
    ? '../../test/services/service-content/configs/datasource-config.js'
    : './configs/datasource-config.js';
const { default: rawDatasourceConfig } = await import(datasourceConfigPath);

async function initialize() {
  createAppConfig(rawAppConfig, rawDatasourceConfig);
  if (appConfig?.nodeEnv !== 'production') global.logMode = 'trace';

  await createDatasources(appConfig).catch((error) => {
    console.error(error);
    helper.application.exitOnError();
  });

  // Datasource'lar hazir olduktan sonra yuklenir (modul duzeyinde container kurulumu env'i erken okumasin).
  const { buildApp } = await import('./src/app.js');
  const { default: boot } = await import('./src/boot.js');
  const app = buildApp();
  const server = app.listen(appConfig.port, appConfig.host);
  helper.application.appStarted(appConfig);
  await boot().catch((error) => {
    console.error(error);
    helper.application.exitOnError();
  });

  // Graceful shutdown: PM2 kill_timeout (30 sn) bu drain'den UZUN olmali.
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} alindi, bosaltiliyor...`);
    try {
      await new Promise((resolve) => server.close(resolve));
      await datasources.coreAppDb?.disconnect?.();
      process.exit(0);
    } catch (error) {
      console.error('[shutdown] hata', error);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

initialize();
