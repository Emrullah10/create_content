import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import openApi from '../../../../services/create-content-service-content/definitions/rest-api-definition.js';
import routes from '../../../../services/create-content-service-content/routes/rest-routes.js';
import { bootServiceTest, shutdownServiceTest, HOST } from '../helpers/boot.js';

// Üretim kablolaması (localGuard + localCaller + route-binder) sınanır; sahte kimlik header'ı YAZILMAZ.
// Her OpenAPI GET yolunun handler'ına ULAŞILDIĞI ve 5xx vermediği doğrulanır. 200 dayatılmaz:
// yol parametreleri uydurma değerle doldurulur ('1'), dürüst yanıt 404 olabilir.
let app;
beforeAll(async () => {
  await bootServiceTest();
  const { buildApp } = await import('../../../../services/create-content-service-content/src/app.js');
  app = buildApp();
});
afterAll(shutdownServiceTest);

const fillPath = (p) => p.replace(/\{[^}]+\}/g, '1');
const mount = '/api/create-content-service-content';
const gets = Object.entries(openApi.paths).filter(([, m]) => m?.get?.['x-functionName']);

describe('route kablolaması', () => {
  test('her operasyonun handler export\'u var', () => {
    for (const methods of Object.values(openApi.paths)) {
      for (const spec of Object.values(methods)) expect(typeof routes[spec['x-functionName']]).toBe('function');
    }
  });

  test('kayıtsız yol 404', async () => {
    expect((await request(app).get(`${mount}/v1/nope`).set(HOST)).status).toBe(404);
  });
});

describe.each(gets)('GET %s', (pathStr, methods) => {
  const fnName = methods.get['x-functionName'];
  test(`${fnName} handler'a ulaşır`, async () => {
    const res = await request(app).get(`${mount}${fillPath(pathStr)}`).set(HOST).set('Connection', 'close');
    if (res.status >= 500) throw new Error(`${fnName} 5xx (${res.status}): ${JSON.stringify(res.body).slice(0, 400)}`);
    expect(res.status).toBeLessThan(500);
    expect(res.body !== null && typeof res.body === 'object').toBe(true);
    expect(res.body?.error?.code).not.toBe('PERMISSION_DENIED');
  }, 20_000);
});
