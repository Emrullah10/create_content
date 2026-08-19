export default {
  rootDir: '../../',
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/test/services/**/*.test.js'],
  moduleNameMapper: {
    '^@create-content/(.*)$': '<rootDir>/packages/modules/$1/index.js',
  },
};
