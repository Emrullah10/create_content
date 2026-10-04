// Servis acilis kancasi. main.js, datasource'lar ve route'lar hazir olduktan sonra cagirir.
import '../../../core/service-content/src/infrastructure/persistence/init-query-builder.js';

export default async () => {
  // 1) PORTLAR: bu surecte kullanilan HER port burada kurulur (LLM, gorsel, yayin: Faz 6-7).
  // 2) ZAMANLANMIS ISLER: testte ve DISABLE_CRON=true iken kapali (Faz 7).
  const cronDisabled = process.env.NODE_ENV === 'test' || process.env.DISABLE_CRON === 'true';
  if (cronDisabled) return;
};
