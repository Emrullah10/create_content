export default {
  rootDir: '.',
  maxWorkers: 4,
  forceExit: true,
  projects: [
    {
      displayName: 'backend',
      rootDir: '.',
      transform: {},
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/**/__tests__/**/*.test.js'],
      testTimeout: 20_000,
    },
  ],
};
