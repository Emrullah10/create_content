# Kararlar

Biçim: `[YYYY-MM-DD] Karar — gerekçe — nasıl geri alınır`. Mimari kaynağı: `docs/ARCHITECTURE.md` (şablon v2.0, §20 tek servisli varyant).

## Yer tutucular
| Yer tutucu | Değer |
|---|---|
| `<proje>` / `<Proje>` / `<PROJE>` | `create-content` / `Create Content` / `CREATE_CONTENT` |
| `<domain>` / `<şema>` | `content` / `content` |
| `<proje_db>` | `create_content` (native PG15, rol `create_content`) |
| `<PORT_BASE>` | `3100` (servis). Panel Vite: `5174` |
| `<TZ>` / `<diller>` | `Europe/Istanbul` / `tr,en` (panel varsayılanı tr) |

## Servis tablosu
| Domain | Şema | Port | Tablolar |
|---|---|---|---|
| content | content, enums | 3100 | theme, topic, article, article_section, article_revision, research_source, asset, publication, job_run, llm_call |

## Kararlar
- [2026-10-04] Tek servis, gateway/Redis/oturum YOK — tek kullanıcılı yerel araç (§20) — gateway sonradan eklenebilir; `localCaller` yerine oturum middleware'i konur.
- [2026-10-04] Süreç-içi gateway: `localGuard` (Host beyaz listesi, unsafe method'larda Origin kontrolü, CORS yok) + `localCaller` (kimlik başlıklarını siler, sabit operatör kimliği yazar) — `wrap/getCaller/guard` değişmeden çalışsın — auth eklenince yalnızca `localCaller` değişir.
- [2026-10-04] service-discovery yerine `app-route-binder` (Redis'siz OpenAPI `x-functionName` bağlama) — Redis yok — gateway gelirse service-discovery kopyalanır.
- [2026-10-04] Tenant/organization kolonları YOK (tek kullanıcı); `content` ve `enums` şemaları `UNSCOPED_READ_SCHEMAS` — sahte tenant/org/user tabloları gereksiz — kolon eklemek + table-definitions güncellemek.
- [2026-10-04] Cron kilidi Postgres advisory lock (tek, sabit bağlantı) — Redis yok; eski kilit iki bağlantıda alınıp bırakılıp sızıyordu.
- [2026-10-04] Python AI servisi kaldırılır; LLM/görsel çağrıları Node'da port/adaptör (OpenAI-uyumlu SDK) — tek runtime, port karmaşası biter — adaptör arayüzü sabit, Python geri eklenebilir.
- [2026-10-04] LLM'ler yalnızca ücretsiz (NVIDIA NIM + Ollama), rol bazlı env ile — maliyet sıfır — Claude adaptörü env ile eklenebilir.
- [2026-10-04] Yayın her zaman panel onayıyla; konular panelden onaylanır — kullanıcı kararı.
- [2026-10-04] Veritabanı pg_dump ile yedeklenip sıfırdan kurulur (`backups/`, gitignore'da) — kullanıcı kararı — `pg_restore`.
- [2026-10-04] Medium: dev.to canlı olduktan sonra panelden import linki (API token verilmiyor) — resmi yol yok.

- [2026-10-05] Yazar nemotron-3-ultra-550b, hakem+yardımcı nemotron-3-super-120b (llama-3.3 NVIDIA'dan kalktı) — gerçek koşuda ölçüldü — .env'de LLM_<ROL>_MODEL.
- [2026-10-05] Konu benzerliği yalnız pg_trgm + dedup_key (planlanan ek LLM benzerlik çağrısı yapılmadı) — maliyet/sadelik, trgm yeterli — gerekirse generate-topics'e LLM kontrolü eklenir.
- [2026-10-05] Asset'ler diske yazılmadan render→yükle akışıyla işlenir (tmp dosya yok); yeniden deneme yalnız `uploaded` olmayanları işler — eski tmp-dizin hatası kökten kalktı.
- [2026-10-05] E2E Docker'sız: ayrı DB (`create_content_e2e`), ayrı portlar (3199/5275), LLM_PROVIDER=fake; Playwright puppeteer'ın Chrome'unu kullanır.
- [2026-10-05] CI'da E2E yok (Chrome gerektirir); lint + web + backend (postgres:15) + build koşar.

## BEKLİYOR
- Sunucuya taşıma ve auth katmanı.
- dev.to'ya ilk gerçek gönderim (kullanıcı onayıyla).
- Eski DB `create_content_old_20261004` olarak duruyor (silinmedi) + `backups/create_content-2026-10-04.dump`; kullanıcı onayıyla `DROP DATABASE`.
- dev.to'ya ilk GERÇEK gönderim (DEVTO_PUBLISH_MODE=draft ile; kullanıcı onayıyla).
- GitHub assets yüklemesinin gerçek ilk denemesi (şu ana kadar yalnız sahte host ile doğrulandı).

- [2026-10-05] Panel girişi: `PANEL_PASSWORD` varsa `panel-auth-middleware` (HMAC imzalı HttpOnly cerez, durumsuz, 5 hatada 429); yoksa kapalı. dev.to'da elle yayına alınan taslaklar `POST /v1/publications/sync` ile (panel Yayınlar sayfası açılınca da) yerel kayda yansır.
