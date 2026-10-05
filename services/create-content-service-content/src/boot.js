// Servis acilis kancasi. main.js, datasource'lar ve route'lar hazir olduktan sonra cagirir.
import cron from 'node-cron';
import { SYSTEM_CALLER } from 'app-shared';
import '../../../core/service-content/src/infrastructure/persistence/init-query-builder.js';
import container from './container.js';
import { readContentConfig } from './config.js';
import { installPortsFromEnv } from './infrastructure/install-ports.js';

// Yeniden baslatma kurtarmasi: surec oldurulurse `running` kalan is kayitlari ve `drafting`te asili makaleler olur.
// Burada acilista HICBIR pipeline calismadigi icin hepsi yetimdir: isler failed'a, makaleler failed'a (panelden "devam et") cekilir.
export const recoverInterruptedWork = async ({ repos }) => {
  const jobs = await repos.jobRunRepo.failOrphans();
  const stuck = await repos.articleRepo.listStuckDrafting({ olderThanMinutes: 0 });
  for (const a of stuck) await repos.articleRepo.transition({ articleId: a.articleId, from: ['drafting'], to: 'failed', patch: { error: `interrupted: service restarted after stage "${a.articlePipelineStage ?? 'start'}"` } });
  return { jobs, articles: stuck.length };
};

export default async () => {
  // 1) PORTLAR: bu surecte kullanilan HER port burada kurulur (cron kapali olsa da; HTTP'den tetiklenen isler de kullanir).
  const ports = installPortsFromEnv({ recorder: (call) => container.repos.llmCallRepo.insert(call) });
  console.log('[boot] ports:', JSON.stringify(ports));

  const recovered = await recoverInterruptedWork(container);
  if (recovered.jobs || recovered.articles) console.log(`[boot] recovered interrupted work: ${recovered.jobs} job(s), ${recovered.articles} article(s)`);

  // 2) ZAMANLANMIS ISLER: testte ve DISABLE_CRON=true iken kapali.
  const cronDisabled = process.env.NODE_ENV === 'test' || process.env.DISABLE_CRON === 'true';
  if (cronDisabled) return;
  const config = readContentConfig();

  cron.schedule(
    config.dailyCron,
    async () => {
      try {
        const result = await container.useCases.pipeline.runDaily({ caller: SYSTEM_CALLER, wait: true });
        console.log(`[daily-content] ${JSON.stringify({ status: result.status, ok: result.ok, skipped: result.skipped, reason: result.reason, articleCode: result.articleCode })}`);
      } catch (error) {
        console.error('[daily-content] failed', error.message);
      }
    },
    { timezone: config.timezone }, // ZORUNLU: cron sunucu saatiyle calisir
  );
  // Basarisiz dev.to yayinlari: her 15 dakikada (dakika kaydirmali) yeniden dener; deneme siniri ve belirsiz-hata korumasi use-case'te.
  cron.schedule(
    '7,22,37,52 * * * *',
    async () => {
      try {
        const r = await container.useCases.publication.retryFailed({ caller: SYSTEM_CALLER });
        if (r.retried) console.log(`[publish-retry] ${r.succeeded}/${r.retried} succeeded`);
      } catch (error) {
        console.error('[publish-retry] failed', error.message);
      }
    },
    { timezone: config.timezone },
  );
  console.log(`[boot] daily-content scheduled: "${config.dailyCron}" (${config.timezone})`);
};
