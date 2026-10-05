import { test, expect } from '@jest/globals';
import fs from 'node:fs';

// rest-routes.js'te `h.<ad>` ile kullanilan her handler index.js'ten gercekten export edilmeli (eksikse yalniz cagrilinca 500 verir).
test('rest-routes.js icindeki tum handler\'lar export edilmis', async () => {
  const src = fs.readFileSync('services/create-content-service-content/routes/rest-routes.js', 'utf8');
  const names = [...src.matchAll(/\bh\.(\w+)/g)].map((m) => m[1]);
  const h = await import('../../../../../services/create-content-service-content/src/interfaces/http/index.js');
  expect(names.filter((n) => typeof h[n] !== 'function')).toEqual([]);
});
