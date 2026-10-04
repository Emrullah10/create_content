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

  // Kapanis: yeni baglanti kabul edilmez, bosta/acik baglantilar kapatilir ve GECIKMEDEN cikilir. Calisan bir pipeline'i
  // BEKLEMEYIZ: yarim kalan is bir sonraki acilista boot.js kurtarmasiyla `failed` olur ve panelden "devam et" ile surer.
  // (Eskiden server.close tum baglantilar bitene kadar bekliyor, eski surec yasamaya devam edip kilit tutuyordu.)
  // PM2 kill_timeout (30 sn) bu surenin ustunde olmali.
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} alindi, kapaniyor...`);
    const force = setTimeout(() => {
      console.error('[shutdown] zaman asimi, zorla cikiliyor');
      process.exit(1);
    }, 10_000);
    force.unref();
    try {
      const closed = new Promise((resolve) => server.close(resolve));
      server.closeIdleConnections();
      setTimeout(() => server.closeAllConnections(), 2000).unref();
      await closed;
      const { shutdownPorts } = await import('./src/infrastructure/ports.js');
      await shutdownPorts();
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
