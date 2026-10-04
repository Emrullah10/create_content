import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  initQueryBuilder,
  processColumnValues,
  getDefaultCreatedColumns,
  getDefaultUpdatedColumns,
  getDefaultTenantAndOrganizationColumns,
  getColumnName,
} from '../index.js';
import {
  getInsertScript,
  getUpdateScript,
  getDeleteScript,
  getReadScript,
} from '../select.builder.js';
import { buildSort } from '../sort.builder.js';
import { buildFilterClauses } from '../where.builder.js';
import { buildPagination } from '../pagination.builder.js';

// Minimal schema fixture mirroring the shape produced by
// core/service-*/.../table-definitions.js. Columns are snake_case in SQL
// (original) but keyed by their camelCase form — this is the exact contract
// initQueryBuilder / getColumnName depend on.
const schema = {
  table: { tableNameWithSchema: 'app.item' },
  item: {
    itemId: { original: 'item_id', camelCase: 'itemId', isIdentity: true },
    itemName: { original: 'item_name', camelCase: 'itemName' },
    itemFlag: { original: 'item_flag', camelCase: 'itemFlag' },
    itemCount: { original: 'item_count', camelCase: 'itemCount' },
    itemNote: { original: 'item_note', camelCase: 'itemNote' },
    itemMeta: { original: 'item_meta', camelCase: 'itemMeta' },
    itemCreatedAt: {
      original: 'item_created_at',
      camelCase: 'itemCreatedAt',
    },
    itemCreatedBy: {
      original: 'item_created_by',
      camelCase: 'itemCreatedBy',
    },
    itemUpdatedAt: {
      original: 'item_updated_at',
      camelCase: 'itemUpdatedAt',
    },
    itemUpdatedBy: {
      original: 'item_updated_by',
      camelCase: 'itemUpdatedBy',
    },
    itemTenantCode: {
      original: 'item_tenant_code',
      camelCase: 'itemTenantCode',
    },
    itemOrganizationId: {
      original: 'item_organization_id',
      camelCase: 'itemOrganizationId',
    },
  },
};

const caller = {
  callerUserId: 42,
  callerTenantCode: 1,
  callerOrganizationId: 7,
};

beforeEach(() => {
  // Module-level allColumns / tableDefinitions cache is shared — reset each
  // test to avoid leakage between describe blocks.
  initQueryBuilder({ item: schema });
});

describe('initQueryBuilder + getColumnName', () => {
  test('populates allColumns cache and maps camelCase → original', () => {
    expect(getColumnName('itemId')).toBe('item_id');
    expect(getColumnName('itemCreatedBy')).toBe('item_created_by');
    expect(getColumnName('itemOrganizationId')).toBe('item_organization_id');
  });

  test('unknown column throws _NOT_FOUND', () => {
    expect(() => getColumnName('itemNope')).toThrow('ITEMNOPE_NOT_FOUND');
  });
});

// Regression: the 2026-04-22 fix switched processColumnValues from
// `data[key] || default` to `key in data ? data[key] : default`, so explicit
// false/0/''/null values are no longer silently replaced by the default.
describe('processColumnValues — falsy regression', () => {
  test('preserves explicit false', () => {
    const { parameters } = processColumnValues(
      ['itemFlag'],
      { itemFlag: false },
      {},
    );
    expect(parameters).toEqual([false]);
  });

  test('preserves explicit 0', () => {
    const { parameters } = processColumnValues(
      ['itemCount'],
      { itemCount: 0 },
      {},
    );
    expect(parameters).toEqual([0]);
  });

  test('preserves explicit empty string', () => {
    const { parameters } = processColumnValues(
      ['itemNote'],
      { itemNote: '' },
      {},
    );
    expect(parameters).toEqual(['']);
  });

  test('preserves explicit null', () => {
    const { parameters } = processColumnValues(
      ['itemMeta'],
      { itemMeta: null },
      {},
    );
    expect(parameters).toEqual([null]);
  });

  test('falls back to default only when key is missing from data', () => {
    const { parameters } = processColumnValues(
      ['itemName'],
      {},
      { itemName: 'default-value' },
    );
    expect(parameters).toEqual(['default-value']);
  });
});

describe('processColumnValues — fragment pattern', () => {
  test('function value is inlined as literal SQL, not parameterized', () => {
    const { parameters, placeholders } = processColumnValues(
      ['itemCreatedAt'],
      {},
      { itemCreatedAt: () => 'NOW()' },
    );
    expect(placeholders).toEqual(['NOW()']);
    // Critically: no parameter is bound for the function value.
    expect(parameters).toEqual([]);
  });

  test('mixed scalar + fragment keep correct placeholder indices', () => {
    const { parameters, placeholders } = processColumnValues(
      ['itemName', 'itemCreatedAt', 'itemCount'],
      { itemName: 'x', itemCount: 5 },
      { itemCreatedAt: () => 'NOW()' },
    );
    expect(placeholders).toEqual(['$1', 'NOW()', '$2']);
    expect(parameters).toEqual(['x', 5]);
  });
});

describe("getDefaultCreatedColumns — 'none' sentinel + undefined guard", () => {
  test('populates createdAt=NOW() fragment + createdBy=callerUserId', () => {
    const cols = getDefaultCreatedColumns('item', caller);
    expect(typeof cols.itemCreatedAt).toBe('function');
    expect(cols.itemCreatedAt()).toBe('NOW()');
    expect(cols.itemCreatedBy).toBe(42);
  });

  test("'none' sentinel skips createdBy but keeps createdAt", () => {
    const cols = getDefaultCreatedColumns('item', { callerUserId: 'none' });
    expect(cols.itemCreatedBy).toBeUndefined();
    expect(typeof cols.itemCreatedAt).toBe('function');
    expect(cols.itemCreatedAt()).toBe('NOW()');
  });

  test('undefined callerUserId throws', () => {
    expect(() => getDefaultCreatedColumns('item', {})).toThrow(
      'callerUserId is undefined',
    );
  });
});

describe('getDefaultUpdatedColumns', () => {
  test('populates updatedAt=NOW() + updatedBy=callerUserId', () => {
    const cols = getDefaultUpdatedColumns('item', caller);
    expect(cols.itemUpdatedAt()).toBe('NOW()');
    expect(cols.itemUpdatedBy).toBe(42);
  });

  test("'none' skips updatedBy", () => {
    const cols = getDefaultUpdatedColumns('item', { callerUserId: 'none' });
    expect(cols.itemUpdatedBy).toBeUndefined();
  });

  test('undefined throws', () => {
    expect(() => getDefaultUpdatedColumns('item', {})).toThrow(
      'callerUserId is undefined',
    );
  });
});

describe('getDefaultTenantAndOrganizationColumns', () => {
  test('populates tenantCode + organizationId', () => {
    const cols = getDefaultTenantAndOrganizationColumns('item', caller);
    expect(cols.itemTenantCode).toBe(1);
    expect(cols.itemOrganizationId).toBe(7);
  });

  test("'none' tenant skips tenantCode but keeps org", () => {
    const cols = getDefaultTenantAndOrganizationColumns('item', {
      callerTenantCode: 'none',
      callerOrganizationId: 7,
    });
    expect(cols.itemTenantCode).toBeUndefined();
    expect(cols.itemOrganizationId).toBe(7);
  });

  test("'none' organization skips organizationId but keeps tenant", () => {
    const cols = getDefaultTenantAndOrganizationColumns('item', {
      callerTenantCode: 1,
      callerOrganizationId: 'none',
    });
    expect(cols.itemTenantCode).toBe(1);
    expect(cols.itemOrganizationId).toBeUndefined();
  });

  test('missing tenantCode throws', () => {
    expect(() =>
      getDefaultTenantAndOrganizationColumns('item', {
        callerOrganizationId: 7,
      }),
    ).toThrow('callerTenantCode is undefined');
  });

  test('missing organizationId throws', () => {
    expect(() =>
      getDefaultTenantAndOrganizationColumns('item', {
        callerTenantCode: 1,
      }),
    ).toThrow('callerOrganizationId is undefined');
  });

  // bug-1754 — kapsam tespiti ADA dayalidir ve ada gore yakalanan her kolon
  // kapsam ANLAMI tasimaz. `reference.shipping_line` platform referans
  // verisidir; `shipping_line_organization_id` kolonu vardir ama TUM
  // satirlarda NULL'dur. Kapsam sayildiginda her okumaya
  // `organization_id = <caller>` ekleniyordu ve NULL hicbir organizasyonla
  // eslesmedigi icin `/v1/shipping-lines` HER cagirana BOS dizi donuyordu —
  // teklif formunun tasiyici secicisi hep bos, `lineId` ise ZORUNLU.
  // Hata vermiyordu, yalnizca "secenek yok" goruntusu veriyordu.
  test('excludeFromCallerScope:true olan organizationId kolonu KAPSAMA GIRMEZ', () => {
    initQueryBuilder({
      item: {
        table: { tableNameWithSchema: 'app.item' },
        item: {
          ...schema.item,
          itemOrganizationId: {
            ...schema.item.itemOrganizationId,
            excludeFromCallerScope: true,
          },
        },
      },
    });
    const cols = getDefaultTenantAndOrganizationColumns('item', caller);
    // Tenant kapsami DEVAM EDER — cikis kapisi kolon BAZINDADIR, tablo degil.
    expect(cols.itemTenantCode).toBe(1);
    expect(cols.itemOrganizationId).toBeUndefined();
  });

  test('bayrak YOKKEN davranis DEGISMEZ (varsayilan opt-in degil)', () => {
    const cols = getDefaultTenantAndOrganizationColumns('item', caller);
    expect(cols.itemOrganizationId).toBe(7);
  });

  // Denetim #72: iki kapsam org kolonu → sessiz "ilki" seçimi yok, hata.
  test('birden cok kapsam org kolonu varsa PATLAR (sessiz ilk-kolon secimi yok)', () => {
    initQueryBuilder({
      item: {
        table: { tableNameWithSchema: 'app.item' },
        item: {
          ...schema.item,
          itemCarrierOrganizationId: {
            ...schema.item.itemOrganizationId,
            original: 'item_carrier_organization_id',
            camelCase: 'itemCarrierOrganizationId',
          },
        },
      },
    });
    expect(() => getDefaultTenantAndOrganizationColumns('item', caller)).toThrow(
      /ambiguous caller scope/,
    );
  });
});

describe('getInsertScript', () => {
  test('produces parameterized INSERT with RETURNING *', () => {
    const { script, parameters } = getInsertScript(
      'item',
      { itemName: 'hello' },
      caller,
    );
    expect(script).toMatch(/^INSERT INTO app\.item/);
    expect(script).toMatch(/RETURNING \*;$/);
    // NOW() fragments are inlined, not parameterized
    expect(script).toMatch(/NOW\(\)/);
    // Scalar values are parameterized
    expect(parameters).toContain('hello');
    expect(parameters).toContain(42); // callerUserId
    expect(parameters).toContain(1); // tenantCode
    expect(parameters).toContain(7); // organizationId
  });

  test('excludes identity column from INSERT', () => {
    const { script } = getInsertScript(
      'item',
      { itemId: 999, itemName: 'x' },
      caller,
    );
    expect(script).not.toMatch(/\bitem_id\b/);
  });

  test('createOptions.onConflict is appended raw between VALUES and RETURNING', () => {
    const { script } = getInsertScript(
      'item',
      { itemName: 'x' },
      caller,
      { onConflict: 'ON CONFLICT (item_name) DO NOTHING' },
    );
    expect(script).toMatch(
      / ON CONFLICT \(item_name\) DO NOTHING RETURNING \*;$/,
    );
    expect(script).toMatch(/VALUES \(/);
  });

  test('createOptions.returning overrides default *', () => {
    const { script } = getInsertScript(
      'item',
      { itemName: 'x' },
      caller,
      { returning: 'item_id, item_name' },
    );
    expect(script).toMatch(/RETURNING item_id, item_name;$/);
  });

  test('createOptions.returning composes with onConflict', () => {
    const { script } = getInsertScript(
      'item',
      { itemName: 'x' },
      caller,
      {
        onConflict: 'ON CONFLICT DO NOTHING',
        returning: 'item_id',
      },
    );
    expect(script).toMatch(/ON CONFLICT DO NOTHING RETURNING item_id;$/);
  });

  test('empty returning falls back to *', () => {
    const { script } = getInsertScript(
      'item',
      { itemName: 'x' },
      caller,
      { returning: '   ' },
    );
    expect(script).toMatch(/RETURNING \*;$/);
  });

  test('missing data throws', () => {
    expect(() => getInsertScript('item', null, caller)).toThrow(
      'DATA_NOT_CORRECT_ON_ITEM_INSERT',
    );
  });

  test('falsy explicit values are included, not skipped', () => {
    const { script, parameters } = getInsertScript(
      'item',
      { itemFlag: false, itemCount: 0, itemNote: '' },
      caller,
    );
    expect(script).toMatch(/item_flag/);
    expect(script).toMatch(/item_count/);
    expect(script).toMatch(/item_note/);
    expect(parameters).toContain(false);
    expect(parameters).toContain(0);
    expect(parameters).toContain('');
  });
});

describe('getUpdateScript', () => {
  test('requires identity key in data', () => {
    expect(() => getUpdateScript('item', { itemName: 'x' }, caller)).toThrow(
      'DATA_NOT_CORRECT_ON_ITEM_UPDATE',
    );
  });

  test('SET clause filters out created_* columns (immutable)', () => {
    const { script } = getUpdateScript(
      'item',
      {
        itemId: 10,
        itemName: 'new',
        // Even if a caller tries to override created_*, query-builder drops it.
        itemCreatedBy: 999,
        itemCreatedAt: 'should-not-apply',
      },
      caller,
    );
    expect(script).not.toMatch(/item_created_by\s*=/);
    expect(script).not.toMatch(/item_created_at\s*=/);
    expect(script).toMatch(/item_name\s*=/);
  });

  test('updated_at = NOW() fragment inlined in SET', () => {
    const { script } = getUpdateScript(
      'item',
      { itemId: 10, itemName: 'x' },
      caller,
    );
    expect(script).toMatch(/item_updated_at=NOW\(\)/);
  });

  test('fragment function value in data inlined literally', () => {
    const { script, parameters } = getUpdateScript(
      'item',
      {
        itemId: 10,
        itemCount: () => 'COALESCE(item_count,0) + 1',
      },
      caller,
    );
    expect(script).toMatch(/item_count=COALESCE\(item_count,0\) \+ 1/);
    // Fragment must not consume a parameter slot
    expect(parameters).not.toContain('COALESCE(item_count,0) + 1');
  });

  test('identity value is parameterized at $1', () => {
    const { script, parameters } = getUpdateScript(
      'item',
      { itemId: 10, itemName: 'x' },
      caller,
    );
    expect(parameters[0]).toBe(10);
    expect(script).toMatch(/WHERE item_id=\$1/);
  });

  test('updateOptions.returning overrides default *', () => {
    const { script } = getUpdateScript(
      'item',
      { itemId: 10, itemName: 'x' },
      caller,
      { returning: 'item_id' },
    );
    expect(script).toMatch(/RETURNING item_id;$/);
  });

  test('falsy SET values preserved', () => {
    const { script, parameters } = getUpdateScript(
      'item',
      { itemId: 10, itemFlag: false, itemCount: 0, itemNote: '' },
      caller,
    );
    expect(script).toMatch(/item_flag=/);
    expect(script).toMatch(/item_count=/);
    expect(script).toMatch(/item_note=/);
    expect(parameters).toContain(false);
    expect(parameters).toContain(0);
    expect(parameters).toContain('');
  });
});

describe('getDeleteScript', () => {
  test('injects tenantCode + organizationId into WHERE', () => {
    const { script, parameters } = getDeleteScript(
      'item',
      { filterModel: {} },
      caller,
    );
    expect(script).toMatch(/^delete FROM app\.item/);
    expect(script).toMatch(/item_tenant_code/);
    expect(script).toMatch(/item_organization_id/);
    expect(parameters).toContain(1);
    expect(parameters).toContain(7);
  });

  test('deleteOptions.returning overrides default *', () => {
    const { script } = getDeleteScript(
      'item',
      { filterModel: {} },
      caller,
      { returning: 'item_id' },
    );
    expect(script).toMatch(/returning item_id;/);
  });
});

describe('getReadScript', () => {
  test('injects tenant/organization filters into WHERE', () => {
    const { script, parameters } = getReadScript(
      'item',
      { filterModel: {} },
      caller,
    );
    expect(script).toMatch(/^SELECT \* FROM app\.item/);
    expect(parameters).toContain(1);
    expect(parameters).toContain(7);
  });

  test('selectColumns override', () => {
    const { script } = getReadScript(
      'item',
      { filterModel: {} },
      caller,
      'item_id, item_name',
    );
    expect(script).toMatch(/^SELECT item_id, item_name FROM app\.item/);
  });

  test('joins inlined after table name', () => {
    const { script } = getReadScript(
      'item',
      { filterModel: {} },
      caller,
      '*',
      'JOIN app.other o ON o.item_id = item.item_id',
    );
    expect(script).toMatch(/FROM app\.item JOIN app\.other o/);
  });

  test('groupBy inlined after WHERE', () => {
    const { script } = getReadScript(
      'item',
      { filterModel: {} },
      caller,
      '*',
      '',
      'GROUP BY item_name',
    );
    expect(script).toMatch(/GROUP BY item_name/);
  });
});

describe('buildSort — direction whitelist + array guard', () => {
  test('maps colId and lower-cases-then-whitelists direction', () => {
    expect(buildSort([{ colId: 'itemName', sort: 'desc' }])).toBe(
      'ORDER BY item_name DESC',
    );
    expect(buildSort([{ colId: 'itemName', sort: 'asc' }])).toBe(
      'ORDER BY item_name ASC',
    );
  });

  test('collapses any non-desc direction to ASC (no raw interpolation)', () => {
    // A crafted direction must never reach ORDER BY verbatim.
    expect(
      buildSort([{ colId: 'itemName', sort: 'asc; DROP TABLE item; --' }]),
    ).toBe('ORDER BY item_name ASC');
  });

  test('accepts a qs-style object sortModel (not just an array)', () => {
    expect(buildSort({ 0: { colId: 'itemName', sort: 'desc' } })).toBe(
      'ORDER BY item_name DESC',
    );
  });

  test('empty sortModel returns empty string', () => {
    expect(buildSort([])).toBe('');
    expect(buildSort(undefined)).toBe('');
  });

  test('unknown colId still throws via getColumnName', () => {
    expect(() => buildSort([{ colId: 'itemNope', sort: 'asc' }])).toThrow(
      'ITEMNOPE_NOT_FOUND',
    );
  });
});

describe('buildFilterClauses — placeholder/parameter alignment', () => {
  test('skips a value-bearing filter whose filter is undefined (no desync)', () => {
    const { whereClause, parameters } = buildFilterClauses({
      itemName: { type: 'equals' }, // no `filter` → would dangle $1
      itemNote: { type: 'equals', filter: 'keep' },
    });
    // The value-less equals is dropped; the real filter binds $1, not $2.
    expect(whereClause).toBe('WHERE item_note=$1');
    expect(parameters).toEqual(['keep']);
  });

  test('value-less operators (isNull) are kept without consuming a placeholder', () => {
    const { whereClause, parameters } = buildFilterClauses({
      itemMeta: { type: 'isNull' },
      itemName: { type: 'equals', filter: 'x' },
    });
    expect(whereClause).toBe('WHERE item_meta is null AND item_name=$1');
    expect(parameters).toEqual(['x']);
  });

  test('sequential value filters stay index-aligned', () => {
    const { whereClause, parameters } = buildFilterClauses({
      itemName: { type: 'equals', filter: 'a' },
      itemNote: { type: 'contains', filter: 'b' },
    });
    expect(whereClause).toBe('WHERE item_name=$1 AND item_note ILIKE $2');
    expect(parameters).toEqual(['a', '%b%']);
  });
});

describe('buildPagination — non-negative clamp', () => {
  test('normal range', () => {
    expect(buildPagination(0, 100)).toBe('LIMIT 100 OFFSET 0');
    expect(buildPagination(50, 75)).toBe('LIMIT 25 OFFSET 50');
  });

  test('inverted range clamps limit to 0 (no negative LIMIT)', () => {
    expect(buildPagination(100, 50)).toBe('LIMIT 0 OFFSET 100');
  });

  test('negative startRow clamps offset and limit to 0', () => {
    expect(buildPagination(-10, 5)).toBe('LIMIT 5 OFFSET 0');
    expect(buildPagination(-10, -5)).toBe('LIMIT 0 OFFSET 0');
  });

  test('non-numeric input returns empty string', () => {
    expect(buildPagination(undefined, undefined)).toBe('');
  });

  // Denetim #74: auto-CRUD GET'te değerler query string'den STRING gelir.
  // Yalnız number kabul edilince LIMIT hiç uygulanmıyor, tüm tablo dönüyordu.
  test('query string integer values are applied', () => {
    expect(buildPagination('0', '20')).toBe('LIMIT 20 OFFSET 0');
    expect(buildPagination(' 40 ', '60')).toBe('LIMIT 20 OFFSET 40');
  });

  test('non-integer strings never reach SQL', () => {
    expect(buildPagination('0', '20; DROP TABLE x')).toBe('');
    expect(buildPagination('abc', '10')).toBe('');
    expect(buildPagination('1.5', '10')).toBe('');
    expect(buildPagination('', '10')).toBe('');
    expect(buildPagination(1.5, 10)).toBe('');
  });
});

// M8 (2026-09-10) — coklu deger suzgeci.
//
// ⚠️ VARLIK SEBEBI: `buildFilterClauses` TANIMSIZ bir `type`i SESSIZCE
// DUSURUR (`if (!operatorFunction) return;`). Yani operator eklenmeden
// `{ type: 'in' }` gonderen bir ekran BOS degil, FAZLA satir gorur —
// suzgec hic uygulanmamis gibi. Sessiz ve yanlis veri.
describe('buildFilterClauses — `in` operatoru', () => {
  test('dizi -> = ANY($n), tek parametre olarak baglanir', () => {
    const { whereClause, parameters } = buildFilterClauses(
      { itemName: { type: 'in', filter: ['a', 'b'] } },
      'item',
    );
    expect(whereClause).toBe('WHERE item_name = ANY($1)');
    // Dizi TEK parametredir; $n sirasi bir artar, iki degil.
    expect(parameters).toEqual([['a', 'b']]);
  });

  test('bos dizi -> clause HIC eklenmez ($n sirasi kaymaz)', () => {
    const { whereClause, parameters } = buildFilterClauses(
      { itemName: { type: 'in', filter: [] }, itemCount: { type: 'equals', filter: 5 } },
      'item',
    );
    expect(whereClause).toBe('WHERE item_count=$1');
    expect(parameters).toEqual([5]);
  });

  test('null/undefined/bos degerler ayiklanir', () => {
    const { parameters } = buildFilterClauses(
      { itemName: { type: 'in', filter: ['a', null, undefined, '', 'b'] } },
      'item',
    );
    expect(parameters).toEqual([['a', 'b']]);
  });

  test('dizi olmayan filter -> clause eklenmez', () => {
    const { whereClause } = buildFilterClauses(
      { itemName: { type: 'in', filter: 'a' } },
      'item',
    );
    expect(whereClause).toBe('');
  });

  test('diger operatorlerle karisik kullanimda $n sirasi DOGRU', () => {
    const { whereClause, parameters } = buildFilterClauses(
      {
        itemFlag: { type: 'equals', filter: true },
        itemName: { type: 'in', filter: ['a', 'b'] },
        itemCount: { type: 'greaterThan', filter: 3 },
      },
      'item',
    );
    expect(whereClause).toBe(
      'WHERE item_flag=$1 AND item_name = ANY($2) AND item_count > $3',
    );
    expect(parameters).toEqual([true, ['a', 'b'], 3]);
  });
});
