// Test: worker basina ayri DB (TEST_DB_NAME test/config/worker-db.js'te ayarlanir).
const host = process.env.TEST_DB_HOST || '127.0.0.1';
const port = process.env.TEST_DB_PORT || '5432';
const user = encodeURIComponent(process.env.TEST_DB_USER || process.env.USER || '');
const password = encodeURIComponent(process.env.TEST_DB_PASSWORD || '');
const db = process.env.TEST_DB_NAME || 'create_content_test_1';

export default [
  {
    name: { default: 'coreAppDb' },
    type: { default: 'postgre' },
    connectionString: { default: `postgres://${user}:${password}@${host}:${port}/${db}` },
  },
];
