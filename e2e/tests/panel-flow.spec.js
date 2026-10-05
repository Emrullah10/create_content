import { test, expect } from '@playwright/test';
import en from '../../create-content-web-app/src/shared/translation/locales/en.js';
import { E2E } from '../helpers/env.js';

// Metinler i18n dosyasindan cozulur (elle yazilmaz): dil degisse de, metin degisse de test kirilmaz.
const t = (key) => key.split('.').reduce((o, k) => o?.[k], en);

// Durum chip'i (sekme/başlık gibi aynı metni taşıyan öğelerle karışmasın)
const chip = (page, status) => page.locator('.MuiChip-label').filter({ hasText: t(`status.${status}`) }).first();

const post = async (request, path, data = {}) => {
  const res = await request.post(`${E2E.api}${path}`, { data, headers: { Origin: E2E.panelUrl } });
  expect(res.ok(), `${path} -> ${res.status()}`).toBe(true);
  return (await res.json()).data;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cc_lang', 'en'));
});

test('tema → AI konu önerisi → yazar notuyla onay → yaz → incele → onayla → dev.to taslak → canlı → Medium', async ({ page, request }) => {
  // Önkoşul API ile kurulur; kullanıcıya görünen sonuçlar arayüzden doğrulanır.
  const theme = await post(request, '/themes/create', { name: 'E2E PostgreSQL', targetAudience: 'backend developers', expertiseNotes: 'We vacuum nightly.' });

  // 1) Konu önerisi (sahte LLM)
  await page.goto('/topics');
  await expect(page.getByRole('heading', { name: t('topics.title2') })).toBeVisible();
  await page.getByRole('combobox', { name: t('nav.themes') }).click();
  await page.getByRole('option', { name: 'E2E PostgreSQL' }).click();
  await page.getByRole('button', { name: t('topics.suggest') }).click();
  await expect(page.getByText(t('topics.generated'))).toBeVisible();
  await expect(page.getByText('Partial indexes are the cheapest speedup you are not using')).toBeVisible();

  // 2) Yazar notuyla onay
  await page.getByRole('row', { name: /Partial indexes/ }).getByRole('button', { name: t('topics.approve') }).click();
  await page.getByLabel(t('topics.authorNote')).fill('I saw a partial index cut a dashboard query from seconds to milliseconds.');
  await page.getByRole('dialog').getByRole('button', { name: t('topics.approve') }).click();
  await expect(page.getByText(t('topics.approved'))).toBeVisible();

  // 3) Şimdi yaz (arka plan işi) → makale incelemeye düşer
  await page.goto('/topics?status=approved');
  await page.getByRole('row', { name: /Partial indexes/ }).getByRole('button', { name: t('topics.writeNow') }).click();
  await expect(page.getByText(t('dashboard.started'))).toBeVisible();

  await page.goto('/articles?status=review');
  await expect(page.getByRole('link', { name: /Partial indexes/ })).toBeVisible({ timeout: 90_000 }); // listeye yoklama ile gelir
  await page.getByRole('link', { name: /Partial indexes/ }).click();

  // 4) Kalite raporu kartları
  await expect(chip(page, 'review')).toBeVisible();
  await page.getByRole('tab', { name: t('articles.tabs.report') }).click();
  await expect(page.getByText(t('report.judge'))).toBeVisible();
  await expect(page.getByText(t('report.passed'))).toBeVisible();
  await expect(page.getByText(t('report.criteria.technical_depth'))).toBeVisible();
  await page.getByRole('tab', { name: t('articles.tabs.sources') }).click();
  await expect(page.getByText('MVCC explained')).toBeVisible();

  // 5) Onay
  await page.getByRole('button', { name: t('articles.approve'), exact: true }).click();
  await expect(chip(page, 'approved')).toBeVisible();

  // 6) Yayın: önce taslak, sonra canlı
  await page.getByRole('tab', { name: t('articles.tabs.publishing') }).click();
  await page.getByRole('button', { name: t('publishing.draft') }).click();
  await expect(chip(page, 'draft')).toBeVisible();
  await page.getByRole('button', { name: t('publishing.live') }).click();
  await expect(chip(page, 'published')).toBeVisible();

  // 7) Medium: aktarma bağlantısı açılır, URL kaydedilir
  await expect(page.getByRole('link', { name: t('publishing.mediumOpen') })).toBeVisible();
  await page.getByLabel(t('publishing.mediumUrl')).fill('https://example.com/not-medium');
  await page.getByRole('button', { name: t('common.save'), exact: true }).last().click();
  await expect(page.getByText(t('apiErrors.MEDIUM_URL_INVALID'))).toBeVisible(); // yanlış adres reddedilir
  await page.getByLabel(t('publishing.mediumUrl')).fill('https://me.medium.com/partial-indexes-123');
  await page.getByRole('button', { name: t('common.save'), exact: true }).last().click();
  await expect(page.getByRole('link', { name: 'https://me.medium.com/partial-indexes-123' })).toBeVisible();

  // 8) Yayınlar ekranı iki platformu da gösterir
  await page.goto('/publications');
  await expect(page.getByRole('row', { name: /dev\.to/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Medium/ })).toBeVisible();
  void theme;
});

test('dashboard: onaylı konu yokken uyarı; diller arası geçiş çalışır', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(t('dashboard.noApproved'))).toBeVisible();
  await page.getByRole('button', { name: 'TR' }).click();
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
});

test('güvenlik: yabancı Origin ile yazma API tarafından reddedilir', async ({ request }) => {
  const res = await request.post(`${E2E.api}/themes/create`, { data: { name: 'evil' }, headers: { Origin: 'https://evil.example' } });
  expect(res.status()).toBe(403);
});
