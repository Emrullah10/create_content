import { describe, test, expect } from '@jest/globals';
import { buildTestPayload } from 'example-builder';
import domain from '../../../../core/service-content/src/domain/index.js';
import tableDefs from '../../../../core/service-content/src/infrastructure/persistence/schemas/table-definitions.js';

// ÜRETİLEN-STİL: tableDefs üzerinde parametreli; yeni tabloyu kendiliğinden kapsar. Düzenlenmez.
const entries = Object.entries(tableDefs).filter(([, s]) => s?.table);

describe.each(entries)('%s entity', (name, schema) => {
  const entry = domain[name];
  if (!entry?.entity) return;

  const { entity, errors } = entry;
  const Pascal = name[0].toUpperCase() + name.slice(1);
  const ValidationError = errors[`${Pascal}ValidationError`];
  const NotFoundError = errors[`${Pascal}NotFoundError`];

  const columnsKey = Object.keys(schema).find((k) => k !== 'table');
  const cols = schema[columnsKey];
  // query-builder bu kolonlari kendisi doldurur (created/updated); DB DEFAULT'u olanlar da payload'a ZORUNLU degildir.
  const isExcluded = (k) => {
    const lc = k.toLowerCase();
    return lc.includes('created') || lc.includes('updated');
  };
  const required = Object.entries(cols)
    .filter(([k, c]) => !c.isIdentity && !c.isNullable && !isExcluded(k))
    .map(([k]) => k);

  describe('validate', () => {
    test('accepts a complete payload', () => {
      expect(() => entity.validate(buildTestPayload(schema))).not.toThrow();
    });

    test('throws ValidationError on null', () => {
      expect(() => entity.validate(null)).toThrow(ValidationError);
    });

    if (required.length > 0) {
      test.each(required)('throws when %s is missing', (field) => {
        const data = buildTestPayload(schema);
        delete data[field];
        expect(() => entity.validate(data)).toThrow(ValidationError);
      });
    }
  });

  describe('validateUpsertResult', () => {
    test('returns the first row of a non-empty array', () => {
      expect(entity.validateUpsertResult([{ id: 1 }])).toEqual({ id: 1 });
    });

    test('throws NotFoundError on an empty array', () => {
      expect(() => entity.validateUpsertResult([])).toThrow(NotFoundError);
    });
  });
});
