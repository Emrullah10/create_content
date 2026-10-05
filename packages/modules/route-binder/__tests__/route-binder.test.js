import { describe, test, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import createRouteBinder from '../index.js';
import localGuard from '../../middlewares/local-guard-middleware.js';
import localCaller from '../../middlewares/local-caller-middleware.js';
import { PERMISSIONS, requirePermission, wrap } from 'app-shared';

const appConfig = { name: 'svc', description: 'd', version: '1', url: 'http://127.0.0.1:3100', port: 3100, basePath: '/svc', basePathPrefix: '/api' };
const openApi = () => ({
  openapi: '3.0.0',
  info: {},
  paths: {
    '/v1/things/{id}': { get: { 'x-functionName': 'getThing', ...requirePermission(PERMISSIONS.contentRead) } },
    '/v1/things/special': { get: { 'x-functionName': 'getSpecial', ...requirePermission('nope:perm') } },
    '/v1/open': { get: { 'x-functionName': 'getOpen', ...requirePermission('*') } },
  },
});
const routes = {
  getThing: wrap((req, caller) => ({ id: req.params.id, user: caller.callerUserId })),
  getSpecial: wrap(() => 'special'),
  getOpen: wrap(() => 'open'),
};
const build = ({ withCaller = true } = {}) => {
  const app = express();
  app.use(localGuard(appConfig));
  if (withCaller) app.use(localCaller());
  createRouteBinder({ openApi: openApi(), routes, appConfig, datasources: {} }).bind(app);
  return app;
};
const host = { Host: '127.0.0.1:3100' };

describe('route-binder', () => {
  test('/api/online ve health yanıt verir', async () => {
    const app = build();
    expect((await request(app).get('/api/online').set(host)).body).toBe(true);
    const res = await request(app).get('/api/svc/app/health').set(host);
    expect(res.status).toBe(200);
    expect(res.body.isOnline).toBe(true);
  });

  test('x-functionName ile bağlanır, operatör kimliği caller olur', async () => {
    const res = await request(build()).get('/api/svc/v1/things/42').set(host);
    expect(res.body).toEqual({ success: true, data: { id: '42', user: '1' } });
  });

  test('izin yoksa 403', async () => {
    const res = await request(build()).get('/api/svc/v1/things/special').set(host);
    expect(res.status).toBe(403);
  });

  test("'*' izin herkese açık", async () => {
    expect((await request(build()).get('/api/svc/v1/open').set(host)).status).toBe(200);
  });

  test('istemcinin gönderdiği kimlik başlığı ezilir', async () => {
    const res = await request(build()).get('/api/svc/v1/things/1').set(host).set('useraccountid', '999');
    expect(res.body.data.user).toBe('1');
  });

  test('eksik handler açılışta hata verir', () => {
    expect(() =>
      createRouteBinder({ openApi: openApi(), routes: {}, appConfig, datasources: {} }).bind(express()),
    ).toThrow(/getThing/);
  });

  test('yabancı Host reddedilir (DNS rebinding)', async () => {
    const res = await request(build()).get('/api/online').set('Host', 'evil.example.com');
    expect(res.status).toBe(403);
  });

  test('yabancı Origin ile POST reddedilir, GET geçer', async () => {
    const app = build();
    const post = await request(app).post('/api/svc/v1/open').set(host).set('Origin', 'https://evil.example.com');
    expect(post.status).toBe(403);
    const get = await request(app).get('/api/online').set(host).set('Origin', 'https://evil.example.com');
    expect(get.status).toBe(200);
  });
});
