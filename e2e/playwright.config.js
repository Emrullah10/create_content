import { defineConfig, devices } from '@playwright/test';
import puppeteer from 'puppeteer';
import { E2E } from './helpers/env.js';

// Tarayici: puppeteer'in zaten indirilmis Chrome'u (ayrica `playwright install` gerekmez).
const executablePath = await puppeteer.executablePath();

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  preserveOutput: 'failures-only',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1, // ortak DB ve ortak sayaclar: paralel kosamaz
  reporter: [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }]],
  use: {
    baseURL: E2E.panelUrl,
    locale: 'en-US',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    launchOptions: { executablePath, args: ['--no-sandbox'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
