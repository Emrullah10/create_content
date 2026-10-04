import { rawQuery } from 'app-shared';
import { wrapWithHttpTranslation } from './interfaces/http/translate-domain-error.js';
import { makeThemeRepository } from './infrastructure/persistence/repositories/theme.repository.js';
import { makeCreateTheme } from './application/use-cases/theme/create-theme.use-case.js';
import { makeUpdateTheme } from './application/use-cases/theme/update-theme.use-case.js';
import { makeToggleTheme } from './application/use-cases/theme/toggle-theme.use-case.js';

// Composition root: DI kutuphanesi yok, her use-case bir make<Eylem>(deps) fabrikasi.
// ⚠️ Her use-case DONDURULMUS haritada olmak zorundadir; yalniz *Raw'a eklenen fonksiyon handler/cron'dan
// cagrildiginda "is not a function" verir (container-wiring testi bunu kilitler).
export const buildContainer = ({ rawQueryFn = rawQuery, translateHttpErrors = true, nowFn } = {}) => {
  const repos = {
    themeRepo: makeThemeRepository({ rawQuery: rawQueryFn }),
  };
  const wrap = translateHttpErrors ? wrapWithHttpTranslation : (fn) => fn;
  const deps = { rawQuery: rawQueryFn, ...repos, ...(nowFn ? { nowFn } : {}) };

  const themeRaw = {
    create: makeCreateTheme(deps),
    update: makeUpdateTheme(deps),
    toggle: makeToggleTheme(deps),
  };
  const themeUseCases = Object.freeze({
    create: wrap(themeRaw.create),
    update: wrap(themeRaw.update),
    toggle: wrap(themeRaw.toggle),
    raw: themeRaw,
  });

  const useCases = Object.freeze({ theme: themeUseCases });
  return Object.freeze({ repos, useCases });
};

const container = buildContainer();
export default container;
