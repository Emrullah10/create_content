import { describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { truncateAll, getTestPool, closeAllPools } from '../../../config/db-client.js';
import { bootServiceTest, shutdownServiceTest, HOST } from '../helpers/boot.js';

// Gerçek DB + üretim kablolaması: theme akışı uçtan uca (create → update → toggle → auto-CRUD okuma).
const mount = '/api/create-content-service-content';
let app;
beforeAll(async () => {
  await bootServiceTest();
  app = (await import('../../../../services/create-content-service-content/src/app.js')).buildApp();
});
beforeEach(() => truncateAll('content'));
afterAll(async () => {
  await shutdownServiceTest();
  await closeAllPools();
});

const post = (path, body) => request(app).post(`${mount}${path}`).set(HOST).send(body);

describe('theme akışı', () => {
  test('oluştur → güncelle → pasifleştir → listede görünür', async () => {
    const created = await post('/v1/themes/create', { name: 'Test Theme', tags: 'Node JS', weight: 4, expertiseNotes: 'notes' });
    expect(created.status).toBe(201);
    expect(created.body.data.themeTags).toEqual(['nodejs']);
    const code = created.body.data.themeCode;

    const updated = await post(`/v1/themes/${code}/update`, { description: 'desc', weight: 7 });
    expect(updated.body.data).toMatchObject({ themeDescription: 'desc', themeWeight: 7, themeName: 'Test Theme' });

    const toggled = await post(`/v1/themes/${code}/toggle`, { isActive: false });
    expect(toggled.body.data.themeIsActive).toBe(false);

    const list = await request(app).get(`${mount}/v1/themes`).set(HOST);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].themeCode).toBe(code);
  });

  test('aynı adla ikinci tema 409', async () => {
    await post('/v1/themes/create', { name: 'Dup' });
    const res = await post('/v1/themes/create', { name: 'Dup' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_EXISTS');
  });

  test('doğrulama hatası 400, olmayan tema 404', async () => {
    expect((await post('/v1/themes/create', { name: 'x', weight: 99 })).status).toBe(400);
    expect((await post('/v1/themes/999999/update', { name: 'x' })).status).toBe(404);
  });

  test('SQL anahtarı enjekte edilemez: yama yok sayılır → 400', async () => {
    const created = await post('/v1/themes/create', { name: 'Safe' });
    const res = await post(`/v1/themes/${created.body.data.themeCode}/update`, { 'theme_name = (select 1) --': 'x' });
    expect(res.status).toBe(400);
    const { rows } = await getTestPool().query('SELECT theme_name FROM content.theme');
    expect(rows[0].theme_name).toBe('Safe');
  });

  test('yabancı Origin ile yazma reddedilir', async () => {
    const res = await post('/v1/themes/create', { name: 'evil' }).set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
  });
});
