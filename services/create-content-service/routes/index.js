import express from 'express';
import { handleErrors } from '@create-content/errors';
import { baseHandler } from '@create-content/helper';

import { makeThemeController } from '@create-content/core-service-content/src/interfaces/http/controllers/theme.controller.js';
import { makeTopicController } from '@create-content/core-service-content/src/interfaces/http/controllers/topic.controller.js';
import { makeArticleController } from '@create-content/core-service-content/src/interfaces/http/controllers/article.controller.js';
import { makePublicationController } from '@create-content/core-service-content/src/interfaces/http/controllers/publication.controller.js';
import { makeJobController } from '@create-content/core-service-content/src/interfaces/http/controllers/job.controller.js';

import { makePublishOrchestrator } from '@create-content/core-service-content/src/application/orchestrators/publish.orchestrator.js';

export const buildRoutes = (container) => {
  const router = express.Router();
  const handle = baseHandler(handleErrors);

  const themeController = makeThemeController(container);
  const topicController = makeTopicController(container);
  const articleController = makeArticleController(container);
  const publishOrchestrator = container.publishOrchestrator;
  const publicationController = makePublicationController({
    publishOrchestrator,
    retryPublication: container.retryPublication,
  });
  const jobController = makeJobController(container);

  router.post('/themes', (req, res, next) => handle(req, res, next, 'themes.create', () => themeController.create(req)));
  router.get('/themes', (req, res, next) => handle(req, res, next, 'themes.list', () => themeController.list(req)));
  router.patch('/themes/:id/toggle', (req, res, next) => handle(req, res, next, 'themes.toggle', () => themeController.toggle(req)));

  router.post('/topics/generate', (req, res, next) => handle(req, res, next, 'topics.generate', () => topicController.generate(req)));
  router.patch('/topics/:id/approve', (req, res, next) => handle(req, res, next, 'topics.approve', () => topicController.approve(req)));
  router.patch('/topics/:id/reject', (req, res, next) => handle(req, res, next, 'topics.reject', () => topicController.reject(req)));

  router.get('/articles', (req, res, next) => handle(req, res, next, 'articles.list', () => articleController.list(req)));
  router.get('/articles/:id', (req, res, next) => handle(req, res, next, 'articles.get', () => articleController.get(req)));
  router.patch('/articles/:id', (req, res, next) => handle(req, res, next, 'articles.update', () => articleController.update(req)));
  router.patch('/articles/:id/approve', (req, res, next) =>
    handle(req, res, next, 'articles.approve', () => articleController.approve(req, { qualityThreshold: container.contentConfig.qualityThreshold })));

  router.post('/articles/:articleId/publish', (req, res, next) => handle(req, res, next, 'publications.publish', () => publicationController.publish(req)));
  router.post('/publications/retry', (req, res, next) => handle(req, res, next, 'publications.retry', () => publicationController.retry()));

  router.post('/jobs/daily-content/run', (req, res, next) => handle(req, res, next, 'jobs.runDaily', () => jobController.runDaily()));

  return router;
};
