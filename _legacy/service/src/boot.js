import express from 'express';
import { corsMiddleware, jsonLogMiddleware } from '@create-content/middlewares';
import appConfig from '../configs/app-config.js';
import { buildContainer } from './container.js';
import { buildRoutes } from '../routes/index.js';
import { startScheduler } from './scheduler/index.js';

export const boot = async () => {
  const container = buildContainer();

  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(corsMiddleware);
  app.use(jsonLogMiddleware);
  app.use('/api', buildRoutes(container));

  app.listen(appConfig.port, () => {
    console.log(`[create-content-service] listening on :${appConfig.port}`);
  });

  startScheduler(container);

  return { app, container };
};
