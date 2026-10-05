import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import panelAuth from '../../../../../packages/modules/middlewares/panel-auth-middleware.js';

const MOUNT = '/api/svc';
const run = (mw, { method = 'GET', path, body, cookie } = {}) => new Promise((resolve) => {
  const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ status: this.statusCode, body: b, headers: this.headers }); } };
  mw({ method, path, body, headers: { cookie }, socket: { remoteAddress: '1.1.1.1' } }, res, () => resolve({ passed: true }));
});

describe('panel girişi', () => {
  const OLD = process.env.PANEL_PASSWORD;
  afterEach(() => { if (OLD === undefined) delete process.env.PANEL_PASSWORD; else process.env.PANEL_PASSWORD = OLD; });
  let mw;
  beforeEach(() => { mw = panelAuth({ basePathPrefix: '/api', basePath: '/svc' }); });

  test('PANEL_PASSWORD yoksa kapalı: her şey geçer, session authRequired=false', async () => {
    delete process.env.PANEL_PASSWORD;
    expect((await run(mw, { path: `${MOUNT}/v1/articles/list` })).passed).toBe(true);
    expect((await run(mw, { path: `${MOUNT}/auth/session` })).body.data).toEqual({ authRequired: false, authenticated: true });
  });

  test('parola varsa: oturumsuz 401, yanlış parola 401, doğru parola cerez verir ve API açılır', async () => {
    process.env.PANEL_PASSWORD = 'hunter2';
    expect((await run(mw, { path: `${MOUNT}/v1/articles/list` })).status).toBe(401);
    expect((await run(mw, { method: 'POST', path: `${MOUNT}/auth/login`, body: { password: 'x' } })).status).toBe(401);
    const ok = await run(mw, { method: 'POST', path: `${MOUNT}/auth/login`, body: { password: 'hunter2' } });
    expect(ok.status).toBe(200);
    expect(ok.headers['Set-Cookie']).toMatch(/HttpOnly; SameSite=Strict/);
    const cookie = ok.headers['Set-Cookie'].split(';')[0];
    expect((await run(mw, { path: `${MOUNT}/v1/articles/list`, cookie })).passed).toBe(true);
    expect((await run(mw, { path: `${MOUNT}/v1/articles/list`, cookie: `${cookie}0` })).status).toBe(401);
    expect((await run(mw, { path: `${MOUNT}/auth/session`, cookie })).body.data.authenticated).toBe(true);
  });

  test('5 yanlış denemeden sonra 429', async () => {
    process.env.PANEL_PASSWORD = 'hunter2';
    for (let i = 0; i < 5; i += 1) await run(mw, { method: 'POST', path: `${MOUNT}/auth/login`, body: { password: 'x' } });
    expect((await run(mw, { method: 'POST', path: `${MOUNT}/auth/login`, body: { password: 'hunter2' } })).status).toBe(429);
  });
});
