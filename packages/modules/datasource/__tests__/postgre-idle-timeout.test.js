import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Denetim #93: havuz, boşta bekleyen transaction'ı sonlandıran bir üst sınırla
// kurulur (varsayılan 60 sn; env ile değişir, 0 kapatır; açık konfig kazanır).
const configs = [];
jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: class {
      constructor(cfg) {
        configs.push(cfg);
      }
      on() {}
    },
  },
}));
const { default: Postgre } = await import('../connectors/postgre.js');

let n = 0;
const build = (extra = {}) =>
  Postgre({ name: `db-${++n}`, type: 'postgre', connectionString: `postgres://x@h/db${n}`, ...extra }, 'test');

describe('postgre connector — idle_in_transaction_session_timeout (#93)', () => {
  const saved = process.env.PG_IDLE_IN_TRANSACTION_TIMEOUT_MS;
  beforeEach(() => {
    configs.length = 0;
    delete process.env.PG_IDLE_IN_TRANSACTION_TIMEOUT_MS;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.PG_IDLE_IN_TRANSACTION_TIMEOUT_MS;
    else process.env.PG_IDLE_IN_TRANSACTION_TIMEOUT_MS = saved;
  });

  test('varsayilan 60 sn', () => {
    build();
    expect(configs[0].idle_in_transaction_session_timeout).toBe(60_000);
  });
  test('env ile degisir; 0 kapatir', () => {
    process.env.PG_IDLE_IN_TRANSACTION_TIMEOUT_MS = '15000';
    build();
    process.env.PG_IDLE_IN_TRANSACTION_TIMEOUT_MS = '0';
    build();
    expect(configs[0].idle_in_transaction_session_timeout).toBe(15_000);
    expect(configs[1].idle_in_transaction_session_timeout).toBeUndefined();
  });
  test('acik konfig kazanir', () => {
    build({ idle_in_transaction_session_timeout: 5000 });
    expect(configs[0].idle_in_transaction_session_timeout).toBe(5000);
  });
});
