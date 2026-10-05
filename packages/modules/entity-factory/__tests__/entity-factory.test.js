import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { defineEntity } from '../index.js';

const schema = {
  table: { tableNameWithSchema: 'app.widget' },
  widget: {
    widgetId: { original: 'widget_id', camelCase: 'widgetId', isIdentity: true },
    widgetName: { original: 'widget_name', camelCase: 'widgetName' },
  },
};

// Minimal script generators — just echo the verb so tests can assert which
// scriptFn was invoked and with what args.
const makeScript = (verb) => (tableName, data, caller, verbOptions) => ({
  script: `-- ${verb} ${tableName} --`,
  parameters: [{ data, caller, verbOptions }],
});

// defineEntity uses a module-level Map cache keyed by `${name}:${tableNameWithSchema}`.
// Use a unique name per test to avoid hitting the cache across describe blocks.
let nextId = 0;
const uniqueName = (base) => `${base}_${++nextId}`;

const buildDeps = (overrides = {}) => ({
  readScript: makeScript('READ'),
  createScript: makeScript('CREATE'),
  updateScript: makeScript('UPDATE'),
  deleteScript: makeScript('DELETE'),
  executeScript: jest.fn(async () => ({ rows: [{ widget_id: 1 }] })),
  convertObjectToCamelCase: (rows) =>
    rows.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [
          k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
          v,
        ]),
      ),
    ),
  ...overrides,
});

describe('defineEntity — binding behavior', () => {
  test('without deps, repository is a stub that throws on use', async () => {
    const entity = defineEntity({ name: uniqueName('widget'), schema });
    await expect(entity.useCase.read({}, {})).rejects.toThrow(
      /called without deps/,
    );
  });

  test('with deps, repository is fully bound', async () => {
    const deps = buildDeps();
    const entity = defineEntity({
      name: uniqueName('widget'),
      schema,
      deps,
    });
    const rows = await entity.useCase.read({}, { callerUserId: 1 });
    expect(deps.executeScript).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([{ widgetId: 1 }]);
  });

  test('cache: re-defining same name+table returns cached entity', () => {
    const name = uniqueName('widget');
    const a = defineEntity({ name, schema });
    const b = defineEntity({ name, schema });
    expect(a).toBe(b);
  });

  test('cache: deps can be bound on second call if first had none', async () => {
    const name = uniqueName('widget');
    const stubbed = defineEntity({ name, schema });
    await expect(stubbed.useCase.read({}, {})).rejects.toThrow(
      /called without deps/,
    );

    const deps = buildDeps();
    const bound = defineEntity({ name, schema, deps });
    // Same cached object
    expect(bound).toBe(stubbed);
    // Now useCase works — repository state was swapped in-place
    const rows = await stubbed.useCase.read({}, { callerUserId: 1 });
    expect(rows).toEqual([{ widgetId: 1 }]);
  });
});

describe('repository — verb-based options dispatch', () => {
  let entity;
  let deps;
  let readScript;
  let createScript;
  let updateScript;
  let deleteScript;

  beforeEach(() => {
    readScript = jest.fn(() => ({ script: 'R', parameters: [] }));
    createScript = jest.fn(() => ({ script: 'C', parameters: [] }));
    updateScript = jest.fn(() => ({ script: 'U', parameters: [] }));
    deleteScript = jest.fn(() => ({ script: 'D', parameters: [] }));
    deps = buildDeps({ readScript, createScript, updateScript, deleteScript });
    entity = defineEntity({ name: uniqueName('widget'), schema, deps });
  });

  test('read dispatches readOptions, ignores other opts', async () => {
    await entity.useCase.read(
      { foo: 1 },
      { callerUserId: 1 },
      {
        readOptions: { selectColumns: 'widget_id' },
        createOptions: { onConflict: 'ON CONFLICT' }, // should NOT be passed
      },
    );
    expect(readScript).toHaveBeenCalledTimes(1);
    const [, , , opts] = readScript.mock.calls[0];
    expect(opts).toEqual({ selectColumns: 'widget_id' });
  });

  test('create dispatches createOptions', async () => {
    await entity.useCase.create(
      { widgetName: 'x' },
      { callerUserId: 1 },
      {
        createOptions: {
          onConflict: 'ON CONFLICT DO NOTHING',
          returning: 'widget_id',
        },
      },
    );
    const [, , , opts] = createScript.mock.calls[0];
    expect(opts).toEqual({
      onConflict: 'ON CONFLICT DO NOTHING',
      returning: 'widget_id',
    });
  });

  test('update dispatches updateOptions', async () => {
    await entity.useCase.update(
      { widgetId: 1, widgetName: 'y' },
      { callerUserId: 1 },
      { updateOptions: { returning: 'widget_id' } },
    );
    const [, , , opts] = updateScript.mock.calls[0];
    expect(opts).toEqual({ returning: 'widget_id' });
  });

  test('delete dispatches deleteOptions', async () => {
    await entity.useCase.delete(
      { filterModel: {} },
      { callerUserId: 1 },
      { deleteOptions: { returning: 'widget_id' } },
    );
    const [, , , opts] = deleteScript.mock.calls[0];
    expect(opts).toEqual({ returning: 'widget_id' });
  });

  test('omitted opts -> verbOptions is undefined', async () => {
    await entity.useCase.read({}, { callerUserId: 1 });
    const [, , , opts] = readScript.mock.calls[0];
    expect(opts).toBeUndefined();
  });
});

describe('repository — conn passthrough to executeScript', () => {
  test('conn is forwarded as executeScript 4th arg', async () => {
    const deps = buildDeps();
    const entity = defineEntity({
      name: uniqueName('widget'),
      schema,
      deps,
    });
    const fakeTx = { query: () => {} };
    await entity.useCase.read({}, { callerUserId: 1 }, { conn: fakeTx });
    expect(deps.executeScript).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      undefined,
      { conn: fakeTx },
    );
  });

  test('without conn, 4th arg is { conn: undefined }', async () => {
    const deps = buildDeps();
    const entity = defineEntity({
      name: uniqueName('widget'),
      schema,
      deps,
    });
    await entity.useCase.read({}, { callerUserId: 1 });
    expect(deps.executeScript).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      undefined,
      { conn: undefined },
    );
  });
});

describe('repository — upsert identity-key routing', () => {
  test('with identity value -> update path', async () => {
    const updateScript = jest.fn(() => ({ script: 'U', parameters: [] }));
    const createScript = jest.fn(() => ({ script: 'C', parameters: [] }));
    const deps = buildDeps({ updateScript, createScript });
    const entity = defineEntity({
      name: uniqueName('widget'),
      schema,
      deps,
    });
    await entity.useCase.upsert({ widgetId: 5, widgetName: 'x' }, {
      callerUserId: 1,
    });
    expect(updateScript).toHaveBeenCalledTimes(1);
    expect(createScript).not.toHaveBeenCalled();
  });

  test('without identity value -> create path', async () => {
    const updateScript = jest.fn(() => ({ script: 'U', parameters: [] }));
    const createScript = jest.fn(() => ({ script: 'C', parameters: [] }));
    const deps = buildDeps({ updateScript, createScript });
    const entity = defineEntity({
      name: uniqueName('widget'),
      schema,
      deps,
    });
    await entity.useCase.upsert({ widgetName: 'x' }, { callerUserId: 1 });
    expect(createScript).toHaveBeenCalledTimes(1);
    expect(updateScript).not.toHaveBeenCalled();
  });
});

describe('repository — return contract', () => {
  test('read returns empty array if executeScript returns empty rows', async () => {
    const deps = buildDeps({
      executeScript: jest.fn(async () => ({ rows: [] })),
    });
    const entity = defineEntity({
      name: uniqueName('widget'),
      schema,
      deps,
    });
    const rows = await entity.useCase.read({}, { callerUserId: 1 });
    expect(rows).toEqual([]);
  });

  test('create returns undefined when rows empty (ON CONFLICT DO NOTHING case)', async () => {
    const deps = buildDeps({
      executeScript: jest.fn(async () => ({ rows: [] })),
    });
    const entity = defineEntity({
      name: uniqueName('widget'),
      schema,
      deps,
    });
    const result = await entity.useCase.create(
      { widgetName: 'x' },
      { callerUserId: 1 },
    );
    // Contract documented in cerebrum: DO NOTHING + conflict -> 0 rows -> undefined.
    expect(result).toBeUndefined();
  });

  test('create returns converted rows on success', async () => {
    const deps = buildDeps();
    const entity = defineEntity({
      name: uniqueName('widget'),
      schema,
      deps,
    });
    const rows = await entity.useCase.create(
      { widgetName: 'x' },
      { callerUserId: 1 },
    );
    expect(rows).toEqual([{ widgetId: 1 }]);
  });

  test('broken scriptFn (no script) throws verb-specific error', async () => {
    const deps = buildDeps({
      readScript: () => ({ script: undefined, parameters: [] }),
    });
    const name = uniqueName('widget');
    const entity = defineEntity({ name, schema, deps });
    await expect(
      entity.useCase.read({}, { callerUserId: 1 }),
    ).rejects.toThrow(new RegExp(`${name.toUpperCase()}_READ_SCRIPT_BROKEN`));
  });
});

// Denetim #18/#20: auto-CRUD GET `SELECT *` ile okur. `sensitive: true`
// kolonlar (şifre hash'i, ödeme token'ı...) HTTP yanıtından çıkarılmalı, ama
// servis içi `useCase.read` TAM satırı görmeye devam etmeli (giriş akışı
// şifre hash'ini okur).
describe('controller — sensitive column stripping', () => {
  const secretSchema = {
    table: { tableNameWithSchema: 'app.account' },
    account: {
      accountId: { original: 'account_id', camelCase: 'accountId', isIdentity: true },
      accountEmail: { original: 'account_email', camelCase: 'accountEmail' },
      accountPasswordHash: {
        original: 'account_password_hash',
        camelCase: 'accountPasswordHash',
        sensitive: true,
      },
    },
  };
  const row = { account_id: 1, account_email: 'a@b.c', account_password_hash: 'h' };

  test('HTTP read omits sensitive fields', async () => {
    const deps = buildDeps({ executeScript: jest.fn(async () => ({ rows: [row] })) });
    const entity = defineEntity({ name: uniqueName('account'), schema: secretSchema, deps });
    const out = await entity.controller.read({ query: {} }, { callerUserId: 1 });
    expect(out).toEqual([{ accountId: 1, accountEmail: 'a@b.c' }]);
  });

  test('use-case read keeps the full row for in-service callers', async () => {
    const deps = buildDeps({ executeScript: jest.fn(async () => ({ rows: [row] })) });
    const entity = defineEntity({ name: uniqueName('account'), schema: secretSchema, deps });
    const out = await entity.useCase.read({}, { callerUserId: 1 });
    expect(out[0].accountPasswordHash).toBe('h');
  });

  test('HTTP upsert response omits sensitive fields', async () => {
    const deps = buildDeps({ executeScript: jest.fn(async () => ({ rows: [row] })) });
    const entity = defineEntity({ name: uniqueName('account'), schema: secretSchema, deps });
    const out = await entity.controller.upsert({ body: { accountEmail: 'x' } }, { callerUserId: 1 });
    expect(out[0]).not.toHaveProperty('accountPasswordHash');
  });

  test('tables without sensitive columns are returned unchanged', async () => {
    const deps = buildDeps();
    const entity = defineEntity({ name: uniqueName('widget'), schema, deps });
    const out = await entity.controller.read({ query: {} }, { callerUserId: 1 });
    expect(out).toEqual([{ widgetId: 1 }]);
  });
});

// Denetim #75: gateway public isteğe 'none' sentinel basar; auto-CRUD HTTP
// uçlarında org kapsamlı tabloya anonim erişim 401 olur. Referans tabloları
// (org kolonu yok) ve servis içi useCase çağrıları etkilenmez.
describe('controller — anonim çağıran org verisine ulaşamaz (#75)', () => {
  const orgSchema = {
    table: { tableNameWithSchema: 'app.order' },
    order: {
      orderId: { original: 'order_id', camelCase: 'orderId', isIdentity: true },
      orderOrganizationId: { original: 'order_organization_id', camelCase: 'orderOrganizationId' },
    },
  };
  const anon = { callerUserId: 'none', callerTenantCode: 'none', callerOrganizationId: 'none' };

  test('org kapsamlı tabloda anonim read/upsert → 401 AUTHENTICATION_REQUIRED, sorgu yok', async () => {
    const deps = buildDeps();
    const entity = defineEntity({ name: uniqueName('order'), schema: orgSchema, deps });
    await expect(entity.controller.read({ query: {} }, anon)).rejects.toMatchObject({
      code: 'AUTHENTICATION_REQUIRED',
      statusCode: 401,
    });
    await expect(entity.controller.upsert({ body: {} }, anon)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(deps.executeScript).not.toHaveBeenCalled();
  });

  test('org kolonu excludeFromCallerScope ise (referans verisi) anonim okuma açık', async () => {
    const refSchema = {
      ...orgSchema,
      order: {
        ...orgSchema.order,
        orderOrganizationId: { ...orgSchema.order.orderOrganizationId, excludeFromCallerScope: true },
      },
    };
    const entity = defineEntity({ name: uniqueName('ref'), schema: refSchema, deps: buildDeps() });
    await expect(entity.controller.read({ query: {} }, anon)).resolves.toEqual([{ widgetId: 1 }]);
  });

  test('servis içi useCase anonim sentinel ile çalışmaya devam eder', async () => {
    const entity = defineEntity({ name: uniqueName('order'), schema: orgSchema, deps: buildDeps() });
    await expect(entity.useCase.read({}, anon)).resolves.toHaveLength(1);
  });

  test('oturumlu çağıran etkilenmez', async () => {
    const entity = defineEntity({ name: uniqueName('order'), schema: orgSchema, deps: buildDeps() });
    await expect(
      entity.controller.read({ query: {} }, { callerUserId: 1, callerTenantCode: 1, callerOrganizationId: 5 }),
    ).resolves.toHaveLength(1);
  });
});
