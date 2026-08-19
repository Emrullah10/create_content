# create_content — Otomatik İçerik Üretim & Yayın Sistemi

## Context

Amaç: dev.to ve Medium hesaplarına **her gün otomatik olarak yüksek kaliteli, görsel anlatımı güçlü teknik içerik** üretip yayınlayan bir sistem kurmak. Üretim NVIDIA NIM API ile, mimari `find-job-mono-repo`'daki monorepo şablonunun (`MONOREPO-ARCHITECTURE-TEMPLATE.md`) tek-servisli varyantına **birebir** uyacak.

Bu neden bir "script" değil de tam monorepo: içerik üretimi tek seferlik bir çağrı değil, **çok aşamalı ve durumu olan bir boru hattı** (konu seçimi → outline → taslak → öz-eleştiri → diyagram render → görsel host → kalite skoru → onay → 2 platforma yayın → hata retry). Her aşama kalıcı durum, tekrar deneme ve insan müdahalesi ister. Bunlar veritabanı, use-case ayrımı ve bir kontrol paneli gerektirir.

### Kullanıcı kararları (bu oturumda alındı)

| Karar | Seçim |
|---|---|
| İçerik dili | İngilizce (panel arayüzü Türkçe) |
| Yayın akışı | Taslak üret → panelden onayla → yayınla |
| Görseller | Mermaid→PNG diyagramlar + NVIDIA Stable Diffusion 3.5 kapak görseli + zorunlu kod/tablo/karşılaştırma |
| Görsel hosting | Ayrı public GitHub repo, `raw.githubusercontent.com` URL'i |
| Konu kaynağı | Kullanıcı tema girer + AI spesifik başlıklara açar |
| Çalışma | Tam monorepo + servis içinde `node-cron` |
| Niş | Node/Express mimari, React/frontend, AI-LLM entegrasyonu, PostgreSQL/altyapı, Claude çalışma mantığı, Claude↔Gemini/NVIDIA karşılaştırmaları, React/Flutter mobil-web |

### Sağlayıcı geçişi (2026-08-19, aynı gün)

İlk uygulamada Gemini API kullanıldı ve gerçek anahtarla uçtan uca test edildi (kalite skoru 88 ile başarılı bir çalıştırma dahil, 5 gerçek bug bulunup düzeltildi). Ancak Gemini'nin ücretsiz katmanı hem metin (günde 20 istek) hem görsel (0 kota, faturalandırma şart) modellerinde otomasyon için yetersiz kaldı. **NVIDIA NIM'e (`build.nvidia.com`) geçildi**: kredi kartı istemiyor, ~40 istek/dakika, OpenAI SDK uyumlu, aynı katalogda hem metin (Llama 3.3) hem görsel (Stable Diffusion 3.5) modeli var. `create-content-ai/services/gemini_service.py` → `nvidia_service.py` olarak değiştirildi, tüm `GEMINI_*` env değişkenleri `NVIDIA_*`'ye taşındı.

### Kritik dış kısıt: Medium

Medium **yeni integration token vermiyor** (API repo'su Mart 2023'te arşivlendi). Eski token'ı olanlarda API hâlâ çalışıyor. Kullanıcıda token olup olmadığı bilinmiyor.

→ **Tasarım kararı:** `PublisherPort` arkasında iki Medium adapter'ı olacak, seçim `container.js`'te çalışma anında yapılacak:
- `MEDIUM_INTEGRATION_TOKEN` set ve boot'ta `GET /v1/me` 200 dönüyorsa → `medium-api.publisher.js` (tam otomatik)
- Aksi halde → `medium-import.publisher.js`: dev.to'ya yayınlanan URL kaydedilir, publication `pending_import` olur, panelde tek tıkla Medium "Import a story" akışı açılır. Medium canonical'ı dev.to'ya set eder — SEO için zaten doğru olan bu.

Bu ayrım domain'e sızmaz; `publish.orchestrator.js` sadece "bir publisher" görür.

---

## Mimari

Şablonun **12.2 tek-servisli sadeleştirilmiş varyantı**: `core/` ↔ `services/` ayrımı korunuyor, `service-discovery` ve gateway atlanıyor.

```
create_content/
├── core/service-content/          # @create-content/core-service-content — framework-bağımsız iş mantığı
├── services/create-content-service/  # Express kabuk + node-cron scheduler
├── packages/modules/              # @create-content/{config,datasource,errors,helper,middlewares}
├── create-content-web/            # React 19 + Vite kontrol paneli
├── create-content-ai/             # Python FastAPI + NVIDIA NIM (OpenAI-uyumlu)
├── db-schemas/                    # Numaralı SQL + migrations/
├── test/                          # Jest: config/ + services/service-content/{unit,integration,e2e}
├── scripts/                       # dev.js, build-schema.js, check-gemini-models.js
├── docs/                          # spec + bu mimarinin dokümanı
├── .wolf/  .claude/               # AI hafıza katmanı (minimum kurulum, bkz. şablon 12.3)
├── .env.example
├── CLAUDE.md
└── package.json                   # npm workspaces
```

Root `package.json` workspaces (find-job ile aynı desen):
```json
"workspaces": ["core/*", "packages/modules/*", "services/*", "create-content-web"]
```

### İsimlendirme
`find-job-mono-repo`'daki `@find-job/*` scope'una paralel olarak `@create-content/*`. `core/service-content` → `@create-content/core-service-content`.

---

## Veri Modeli — `db-schemas/`

Domain başına numaralı SQL (şablon Bölüm 6). JS karşılığı `core/service-content/src/infrastructure/persistence/schemas/table-definitions.js`, `scripts/build-schema.js` ikisini senkron tutar.

| Dosya | Tablolar |
|---|---|
| `00-enums-schema.sql` | `topic_status`, `article_status`, `asset_kind`, `asset_status`, `publish_platform`, `publication_status`, `job_status` |
| `01-theme-schema.sql` | `themes` |
| `02-topic-schema.sql` | `topics` |
| `03-article-schema.sql` | `articles`, `article_revisions` |
| `04-asset-schema.sql` | `assets` |
| `05-publication-schema.sql` | `publications` |
| `06-job-schema.sql` | `job_runs` |
| `10-seed-data.sql` | Kullanıcının 7 nişi başlangıç `themes` kaydı olarak |

Kritik alanlar:

- **`themes`** — `name`, `description`, `tags[]`, `target_audience`, `weight` (rotasyon ağırlığı), `is_active`
- **`topics`** — `theme_id`, `title`, `angle`, `outline` jsonb, `keywords[]`, `status` (`suggested|approved|queued|drafting|used|rejected`), `dedup_hash`, `scheduled_for`, `created_by` (`ai|user`)
- **`articles`** — `topic_id`, `title`, `subtitle`, `slug`, `body_markdown`, `summary`, `tags[]`, `cover_asset_id`, `quality_score`, `quality_report` jsonb, `status` (`drafting|needs_assets|review|approved|publishing|published|failed`), `canonical_url`
- **`article_revisions`** — her AI geçişi saklanır (`stage`: `outline|draft|critique|revised|final`, `model`, token sayaçları). Neden: prompt değişikliğinin kaliteyi nasıl etkilediğini geriye dönük görebilmek için.
- **`assets`** — `kind` (`diagram|cover`), `source_kind` (`mermaid|gemini_image`), `source_code` (mermaid metni veya görsel prompt'u), `placeholder_key` (`{{DIAGRAM_1}}`), `local_path`, `remote_url`, `alt_text`, `caption`, `status`
- **`publications`** — `article_id`, `platform`, `external_id`, `external_url`, `status`, `attempt_count`, `error`, `published_at`. **`UNIQUE(article_id, platform)`** — çift yayın koruması burada, uygulama katmanında değil DB'de.
- **`job_runs`** — cron çalıştırma günlüğü, `stats` jsonb

---

## `core/service-content/` — İş Mantığı

```
core/service-content/src/
├── index.js
├── domain/
│   ├── entities/         # topic.js, article.js, asset.js, publication.js (saf factory + invariant)
│   ├── policies/         # quality-policy.js, dedup-policy.js, schedule-policy.js, tag-policy.js
│   └── errors/           # duplicate-topic, quality-below-threshold, publish-failed,
│                         # medium-token-missing, diagram-render-failed, asset-upload-failed
├── application/
│   ├── ports/            # ai.port.js, publisher.port.js, image-host.port.js, renderer.port.js
│   │                     # (JSDoc sözleşmeleri — implementasyon değil)
│   ├── use-cases/
│   │   ├── theme/        # create-theme, list-themes, toggle-theme
│   │   ├── topic/        # generate-topics, approve-topic, reject-topic, pick-next-topic
│   │   ├── article/      # draft-article, critique-and-revise, score-article,
│   │   │                 # update-article, approve-article, list/get-article
│   │   ├── asset/        # render-diagrams, generate-cover, upload-assets, embed-assets
│   │   └── publication/  # publish-to-devto, crosspost-to-medium, retry-publication
│   └── orchestrators/
│       ├── daily-content.orchestrator.js   # konu → outline → taslak → eleştiri → görsel → review
│       └── publish.orchestrator.js         # approved → dev.to → medium
├── infrastructure/
│   ├── persistence/repositories/   # theme, topic, article, asset, publication, job-run
│   ├── persistence/schemas/table-definitions.js
│   ├── ai/ai-client.js             # HTTP → create-content-ai (FastAPI)
│   ├── renderer/mermaid-renderer.js
│   ├── image-host/github-asset-host.js
│   ├── publishers/devto.publisher.js
│   ├── publishers/medium-api.publisher.js
│   ├── publishers/medium-import.publisher.js
│   └── helper/                     # markdown-utils, slugify, retry, retry-after-parser, rate-limiter
└── interfaces/http/
    ├── controllers/                # theme, topic, article, asset, publication, job
    └── translate-domain-error.js   # domain hatası → HTTP status (şablon 3.1)
```

**Şablon 3.2 zorunluluğu:** class ve DI kütüphanesi YOK. Her use-case bir `make*` factory closure'ı: `makeDraftArticle({ articleRepo, aiClient, revisionRepo }) => (input) => {...}`. Tüm bağlantı grafiği `services/.../src/container.js`'te elle görülebilir.

---

## Görsel Boru Hattı (kullanıcının birincil önceliği)

`create-content-ai` markdown'ı **yapılandırılmış JSON** olarak döner (NVIDIA NIM `nvext.guided_json` / structured output) — markdown'dan regex ile diyagram kazımak yerine:

```json
{
  "title": "...", "subtitle": "...", "summary": "...", "tags": ["nodejs","architecture"],
  "body_markdown": "... {{DIAGRAM_1}} ... {{DIAGRAM_2}} ...",
  "diagrams": [
    { "key": "{{DIAGRAM_1}}", "type": "flowchart", "mermaid": "flowchart TD ...",
      "alt": "...", "caption": "..." }
  ],
  "cover_prompt": "..."
}
```

**Neden placeholder + ayrı diyagram dizisi:** diyagram render'ı ve upload'u başarısız olursa makalenin gövdesi bozulmaz; her diyagram bağımsız retry edilebilir; `assets` tablosunda tek tek izlenebilir.

Boru hattı adımları:

1. **Draft prompt'u görsel yoğunluğu zorunlu kılar** — min 2 Mermaid diyagram, min 3 dil etiketli kod bloğu, min 1 karşılaştırma tablosu, uygun yerde before/after. Bu bir öneri değil, `prompts/draft.md` içinde sert kural + `quality_rubric.md`'de puanlanan bir kalem.
2. **Mermaid ön-doğrulama** — `utils/mermaid_guard.py` sözdizimini kontrol eder; bozuksa modele tek bir onarım turu (sonsuz döngü yok, 1 deneme).
3. **Render** — `mermaid-renderer.js`: puppeteer, mermaid ESM gömülü yerel bir HTML'i açar, SVG üretir, **2x DPI** PNG screenshot alır. **Şeffaf değil dolgu arka plan + padding** ile render edilir; dev.to'nun hem açık hem koyu temasında okunur kalması için. Puppeteer zaten mevcut monorepo'nuzda kullanılıyor.
4. **Kapak görseli** — `nvidia_service.py` Stable Diffusion 3.5 ile `cover_prompt`'tan üretir.
5. **Host** — `github-asset-host.js`: GitHub Contents API `PUT /repos/{owner}/{repo}/contents/{path}` ile base64 commit, dönen `raw.githubusercontent.com` URL'i `assets.remote_url`'e yazılır. Yol deseni: `articles/{yyyy}/{mm}/{slug}/diagram-1.png`.
6. **Gömme** — `embed-assets` use-case'i `{{DIAGRAM_N}}` → `![alt](url)` + italik caption dönüşümünü yapar. Placeholder kaldıysa makale `review`'a değil `needs_assets`'te kalır.

---

## Publisher'lar

### dev.to (`devto.publisher.js`)

`POST https://dev.to/api/articles`

Zorunlu davranışlar (araştırmayla doğrulandı, hepsi test edilecek):

| Davranış | Ele alınış |
|---|---|
| `accept: application/vnd.forem.api-v1+json` gönderilmezse v0 alan adları döner | Header sabit olarak set edilir |
| Auth `Authorization: Bearer` değil, `api-key` header'ı | `devto.publisher.js` içinde |
| Tag'ler sessizce lowercase'e çevrilir, tire silinir (`machine-learning`→`machinelearning`) | `domain/policies/tag-policy.js` gönderimden **önce** sanitize eder, max 4 tag |
| 429'da `Retry-After` bazen saniye sayısı, bazen RFC 7231 tarihi | `helper/retry-after-parser.js` iki formatı da parse eder, `parseInt` tek başına kullanılmaz |
| Rate limit (~10 istek/30sn) | `helper/rate-limiter.js` |

Body: `{ article: { title, body_markdown, published, main_image, canonical_url, description, tags, series } }`

`DEVTO_PUBLISH_MODE=draft|live` — **ilk hafta `draft`**: makale dev.to'ya taslak olarak gider, platformun kendi arayüzünde gerçek render'ı görürsünüz, sonra `live`'a geçilir.

### Medium

- `medium-api.publisher.js` — `GET /v1/me` → authorId, `POST /v1/users/{authorId}/posts` (`contentFormat: "markdown"`, `canonicalUrl` = dev.to URL'i, `publishStatus: "draft"`).
- `medium-import.publisher.js` — publication `pending_import` durumunda kalır, panelde "Medium'da Import Et" butonu dev.to URL'ini kopyalayıp `https://medium.com/p/import` açar.
- Seçim `container.js`'te boot-time probe ile; sonuç `job_runs`'a loglanır.

---

## `create-content-ai/` — Python FastAPI + NVIDIA NIM

`find-job-ai` desenine birebir uyar (tek `gemini_service` singleton + servis başına modül).

```
create-content-ai/
├── main.py                    # FastAPI: /api/v1/ai/{generate-topics,outline,draft,critique,score,cover}
├── requirements.txt           # fastapi, uvicorn, google-genai, python-dotenv, pydantic
├── services/
│   ├── gemini_service.py      # tek client, model/retry/timeout merkezi
│   ├── topic_service.py       # tema → 20-30 spesifik başlık + angle
│   ├── outline_service.py     # başlık → yapılandırılmış outline
│   ├── draft_service.py       # outline → yukarıdaki JSON şeması
│   ├── critique_service.py    # öz-eleştiri → revize (2 geçiş)
│   ├── quality_service.py     # 0-100 skor + gerekçe
│   └── image_service.py       # kapak görseli
├── prompts/                   # topic_generation.md, outline.md, draft.md,
│   │                          # critique.md, quality_rubric.md, cover_image.md
└── utils/
    ├── schema.py              # Pydantic response şemaları (structured output)
    └── mermaid_guard.py
```

**Prompt'lar kod içinde değil `prompts/*.md` dosyalarında** — versiyonlanabilir, `article_revisions` ile eşleştirilip "hangi prompt sürümü daha iyi yazdı" sorusu cevaplanabilir.

**Model seçimi env'den (`NVIDIA_TEXT_MODEL`, `NVIDIA_IMAGE_MODEL`), koda gömülmez.** NVIDIA NIM, OpenAI SDK uyumlu bir API (`base_url=https://integrate.api.nvidia.com/v1`) sunar; yapılandırılmış JSON çıktı için `nvext.guided_json` uzantısı kullanılır. `scripts/check-nvidia-models.js` erişilebilir modelleri listeler.

---

## `services/create-content-service/` — Kabuk

```
services/create-content-service/
├── main.js                     # process giriş
├── configs/                    # app-config, datasource-config, ai-config, publisher-config
├── definitions/                # OpenAPI/Swagger
├── middlewares/  routes/
├── ecosystem.config.js         # PM2
├── deploy.sh
└── src/
    ├── boot.js
    ├── container.js            # composition root
    └── scheduler/
        ├── index.js            # node-cron kayıtları
        └── jobs/daily-content.job.js, topic-refill.job.js, publish-retry.job.js
```

| Job | Zamanlama | İş |
|---|---|---|
| `daily-content` | `0 6 * * *` | Sıradaki konuyu al → tam boru hattı → makale `review` durumunda hazır |
| `topic-refill` | `0 3 * * 1` | `approved` konu sayısı eşiğin altındaysa AI'dan yeni başlık üret |
| `publish-retry` | `*/15 * * * *` | `failed` publication'ları üstel backoff ile tekrar dene |

**Çakışma koruması:** her job PostgreSQL `pg_try_advisory_lock` alır. Uzun süren bir çalıştırma bir sonraki tetiklemeyle üst üste binmez. Her çalıştırma `job_runs`'a yazılır.

---

## `create-content-web/` — React Paneli

Şablon Bölüm 10 birebir: React 19 + Vite, **saf JS/JSX (TypeScript yok)**, MUI v7 **wrapper zorunlu** (`MuiButton`, `MuiSelect`…), Zustand (client state) + React Query (server state) ayrımı, SCSS Modules, react-i18next (TR+EN), path alias'lar (`@api`, `@features`, `@shared`…), `container/Container.jsx` provider ağacı.

```
src/features/
├── themes/        # tema CRUD
├── topics/        # kuyruk, onayla/reddet, "AI ile başlık üret"
├── articles/      # liste + detay: markdown önizleme (yan yana), diyagram önizleme,
│                  # inline düzenleme, kalite raporu, "Onayla ve Yayınla"
├── publications/  # yayın durumu, hata/retry, Medium import butonu
└── dashboard/     # takvim görünümü, job_runs logları, istatistik
```

Makale detay sayfası bu sistemin kalbi: sol tarafta düzenlenebilir markdown, sağ tarafta **render edilmiş önizleme (diyagram PNG'leri dahil)**, altta kalite skoru + AI'ın öz-eleştirisi. Onay buradan verilir.

---

## Test Stratejisi

`test/services/service-content/{unit,integration,e2e}` + `test/config/` (şablon 9.1).

- **unit** — `quality-policy`, `dedup-policy`, `tag-policy` (dev.to sanitizasyonu), `retry-after-parser` (integer + RFC 7231 iki formatı), `markdown-utils` placeholder değişimi. DB'siz, saniyeler içinde.
- **integration** — repository'ler gerçek PostgreSQL'e karşı; `UNIQUE(article_id, platform)` çift yayın korumasının gerçekten tuttuğu doğrulanır.
- **e2e** — servisin HTTP API'si uçtan uca; `buildContainer({ aiClient: fakeAi, publishers: fakePublishers, imageHost: fakeHost })` ile dış servisler sahte. **Bu, container'ın bağımlılıkları parametre olarak almasının asıl sebebi** — gerçek NVIDIA/dev.to çağrısı yapmadan tüm boru hattı test edilir.

---

## Uygulama Fazları

| Faz | Kapsam | Bitince elde |
|---|---|---|
| **0** | Monorepo iskeleti, workspaces, `packages/modules/*`, `db-schemas`, native PostgreSQL (Homebrew), `.env.example`, `CLAUDE.md`, `.wolf/` minimum kurulum | `npm install` çalışır, PG ayakta |
| **1** | Domain entity/policy/error, repository'ler, migration'lar, unit+integration testler | Veri katmanı test edilmiş |
| **2** | `create-content-ai`: FastAPI + NVIDIA NIM, prompt dosyaları, structured output, kalite rubriği | Terminal'den bir başlıktan JSON taslak alınabiliyor |
| **3** | Görsel boru hattı: mermaid render + GitHub host + placeholder gömme | Diyagramlı tam markdown üretiliyor |
| **4** | Publisher'lar: dev.to + Medium ikili adapter, rate limit/retry/idempotency | dev.to'ya **taslak** olarak yayın yapılabiliyor |
| **5** | Orchestrator'lar + `node-cron` + `job_runs` + advisory lock | Sistem her sabah kendi kendine taslak üretiyor |
| **6** | React paneli (features, önizleme, onay akışı) | Onay/yayın panelden yapılıyor |
| **7** | E2E testler, `DEVTO_PUBLISH_MODE=live`, ilk gerçek yayın, Medium akışı | Sistem canlı |

---

## Ortam Değişkenleri (`.env.example`)

```bash
NODE_ENV=development
LOG_LEVEL=info
PORT=3100

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=create_content

AI_API_URL=http://localhost:8100/api/v1/ai
NVIDIA_API_KEY=
NVIDIA_TEXT_MODEL=meta/llama-3.3-70b-instruct   # scripts/check-nvidia-models.js ile doğrula
NVIDIA_IMAGE_MODEL=stabilityai/stable-diffusion-3_5-large

DEVTO_API_KEY=
DEVTO_PUBLISH_MODE=draft      # draft | live

MEDIUM_INTEGRATION_TOKEN=     # boş olabilir → import akışına düşer

GITHUB_TOKEN=
GITHUB_ASSETS_REPO=<kullanıcı>/content-assets
GITHUB_ASSETS_BRANCH=main

CONTENT_LANGUAGE=en
QUALITY_THRESHOLD=75
DAILY_CRON=0 6 * * *
TOPIC_QUEUE_MIN=10
```

---

## Doğrulama

Her faz sonunda çalıştırılacak somut adımlar:

1. **Faz 0-1:** native PostgreSQL'de `create_content` rolü/DB'si oluştur, `db-schemas/*.sql`'i sırayla uygula → `npm run build:schema` → `npm run test:unit && npm run test:integration` yeşil.
2. **Faz 2:** `node scripts/check-gemini-models.js` erişilebilir modelleri listeler. `uvicorn main:app` ayakta iken `curl -X POST localhost:8100/api/v1/ai/draft` gerçek bir başlıkla → şemaya uyan JSON (`diagrams[]` dolu, `body_markdown` içinde `{{DIAGRAM_N}}` var).
3. **Faz 3:** Tek bir makale için boru hattını CLI'dan koştur → `assets` tablosunda `status=uploaded` satırlar, `remote_url`'ler tarayıcıda açılıyor, PNG'ler hem beyaz hem koyu zeminde okunur.
4. **Faz 4:** `DEVTO_PUBLISH_MODE=draft` ile bir yayın → dev.to taslaklarında görünüyor, diyagramlar render oluyor, tag'ler sanitize edilmiş. Aynı makaleyi tekrar yayınlamayı dene → `UNIQUE` kısıtı engelliyor, ikinci kayıt oluşmuyor.
5. **Faz 5:** `DAILY_CRON`'u birkaç dakika sonrasına al → job çalışıyor, `job_runs` satırı yazılıyor. İki job'ı aynı anda tetikle → advisory lock ikincisini atlıyor.
6. **Faz 6:** `npm run dev:web` → panelden tema ekle, AI'dan başlık ürettir, taslağı önizle, onayla, dev.to'da taslağın oluştuğunu doğrula.
7. **Faz 7:** `npm run test:e2e` yeşil. Medium: token varsa API ile taslak oluşuyor; yoksa panelden import akışı dev.to URL'iyle açılıyor.

---

## Notlar

- Bu plan onaylandığında ilk iş, tasarımın `docs/superpowers/specs/2026-08-19-create-content-design.md` olarak repoya yazılıp commit'lenmesi olacak (brainstorming akışının spec adımı — plan modunda dosya yazımı kısıtlı olduğu için Faz 0'a taşındı).
- `.wolf/` şablonun **minimum kurulumu** ile başlar (`OPENWOLF.md` + `anatomy.md` + `cerebrum.md` + `buglog.json` + `memory.md`); hook'lar proje oturduktan sonra Faz 7'de eklenir (şablon 12.3 önerisi).
- Kullanıcının belirttiği 7 niş `10-seed-data.sql`'de başlangıç `themes` kayıtları olarak gelir; panelden düzenlenebilir.

## Kaynaklar

- [Forem API V1 — Forem Docs](https://developers.forem.com/api/v1)
- [Three Dev.to API behaviors I had to handle explicitly in a publish pipeline](https://dev.to/morinaga/three-devto-api-behaviors-i-had-to-handle-explicitly-in-a-publish-pipeline-56c0)
- [Publishing to dev.to Programmatically in 2026: What Actually Works](https://dev.to/ankitg12/publishing-to-devto-programmatically-in-2026-what-actually-works-2nkd)
- [Medium/medium-api-docs (arşivlendi)](https://github.com/Medium/medium-api-docs)
- [API/Importing – Medium Help Center](https://help.medium.com/hc/en-us/articles/213480228-API-Importing)
- [NVIDIA NIM — build.nvidia.com API catalog](https://build.nvidia.com)
- [NVIDIA NIM Structured Generation (guided_json)](https://docs.nvidia.com/nim/large-language-models/1.4.0/structured-generation.html)
