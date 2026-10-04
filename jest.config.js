// Vite/jsconfig alias'larinin jest aynasi. Yeni alias UC yere birden eklenir:
// vite.config.js resolve.alias, jsconfig.json paths, burasi.
import { existsSync } from 'node:fs';

// Web test bagimliliklari (react, jsdom, babel) Faz 8'de kurulur; o zamana kadar web projesi dahil edilmez.
const hasWebDeps = existsSync(new URL('./node_modules/jest-environment-jsdom', import.meta.url));

const W = '<rootDir>/create-content-web-app/src';
const webAliases = {
  '^@assets/(.*)$': `${W}/assets/$1`,
  '^@components/(.*)$': `${W}/components/$1`,
  '^@container/(.*)$': `${W}/container/$1`,
  '^@hooks/(.*)$': `${W}/hooks/$1`,
  '^@layouts/(.*)$': `${W}/layouts/$1`,
  '^@pages/(.*)$': `${W}/pages/$1`,
  '^@router/(.*)$': `${W}/router/$1`,
  '^@shared/(.*)$': `${W}/shared/$1`,
  '^@store$': `${W}/store/index.jsx`,
  '^@store/(.*)$': `${W}/store/$1`,
  '^@styles/(.*)$': `${W}/styles/$1`,
  '^@api/(.*)$': `${W}/api/$1`,
  '^@utils/(.*)$': `${W}/utils/$1`,
  '^@features/(.*)$': `${W}/features/$1`,
};

export default {
  rootDir: '.',
  maxWorkers: 4, // yerel PG; ortam degisirse yeniden olc
  forceExit: true, // YALNIZCA kok config'te taninir
  collectCoverageFrom: ['core/**/src/**/*.js', 'services/**/src/**/*.js', '!**/boot.js', '!**/node_modules/**'],
  projects: [
    {
      displayName: 'backend',
      rootDir: '.',
      transform: {},
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/test/services/**/unit/**/*.test.js',
        '<rootDir>/test/services/**/integration/**/*.test.js',
        '<rootDir>/test/services/**/e2e/**/*.test.js',
        '<rootDir>/test/services/**/custom/**/*.test.js',
        '<rootDir>/test/services/repo/**/*.test.js',
        '<rootDir>/packages/**/__tests__/**/*.test.js',
      ],
      globalSetup: '<rootDir>/test/config/db-setup.js',
      globalTeardown: '<rootDir>/test/config/db-teardown.js',
      setupFiles: ['<rootDir>/test/config/worker-db.js'],
      testTimeout: 20_000,
    },
    ...(hasWebDeps ? [{
      displayName: 'web',
      rootDir: '.',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/create-content-web-app/src/**/__tests__/**/*.test.{js,jsx}'],
      extensionsToTreatAsEsm: ['.jsx'],
      transform: {
        '^.+\\.jsx?$': [
          'babel-jest',
          {
            babelrc: false,
            configFile: false,
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        ],
      },
      moduleNameMapper: {
        '\\.(css|scss|sass)$': 'identity-obj-proxy',
        '\\.(svg|png|jpe?g|gif|webp|avif|woff2?|ttf|eot)$': '<rootDir>/test/config/file-stub.js',
        ...webAliases,
      },
      setupFilesAfterEnv: ['<rootDir>/test/config/web-setup.js'],
    }] : []),
  ],
};
