# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.

## Monorepo Yapisi

```
create_content/
├── core/service-content/          # Framework-bagimsiz is mantigi (@create-content/core-service-content)
│   └── src/
│       ├── domain/                # entities, policies, errors
│       ├── application/           # ports, use-cases, orchestrators
│       ├── infrastructure/        # DB repos, AI client, renderer, image-host, publishers
│       └── interfaces/http/       # controllers + error translation
├── services/create-content-service/  # Express calistirma kabugu + node-cron scheduler
│   ├── main.js
│   ├── src/boot.js
│   ├── src/container.js           # composition root
│   ├── src/scheduler/             # daily-content, topic-refill, publish-retry jobs
│   ├── routes/
│   └── definitions/                # OpenAPI/Swagger
├── packages/modules/               # Paylasilan npm paketleri
│   ├── @create-content/config
│   ├── @create-content/datasource
│   ├── @create-content/errors
│   ├── @create-content/helper
│   └── @create-content/middlewares
├── create-content-web/              # React 19 + Vite kontrol paneli
├── create-content-ai/                # Python / FastAPI AI servisi (NVIDIA NIM)
└── db-schemas/                        # Merkezi SQL semalari + migrations/
```

## Teknoloji Yigini

- **Backend**: Node.js (ESM), Express 4, PostgreSQL, node-cron
- **Frontend**: React 19, Vite, MUI v7, Zustand, React Query, i18next, SCSS
- **AI**: Python, FastAPI, NVIDIA NIM (build.nvidia.com, OpenAI-uyumlu API)
- **Package Manager**: npm workspaces

## Mimari Kurallar

- `core/` framework'ten bagimsiz: hicbir Express/HTTP detayi buraya sizmaz.
- Class/DI kütüphanesi yok — her use-case bir `make*` factory closure'i. Baglanti grafigi `services/*/src/container.js`'te elle görülür.
- dev.to publisher: `accept: application/vnd.forem.api-v1+json` header'i zorunlu, auth `api-key` header'i (Bearer degil), tag'ler gönderim öncesi sanitize edilir (lowercase, tiresiz), `Retry-After` hem integer hem RFC 7231 tarih formatinda gelebilir.
- Medium: `MEDIUM_INTEGRATION_TOKEN` bos ise otomatik olarak import-akisina (dev.to-first + panelden manuel import) düser — bkz `core/service-content/src/infrastructure/publishers/`.
- NVIDIA NIM model adlari env'den okunur (`NVIDIA_TEXT_MODEL`, `NVIDIA_IMAGE_MODEL`), koda gömülmez.
- NVIDIA API: OpenAI SDK uyumlu (`base_url=https://integrate.api.nvidia.com/v1`), yapilandirilmis JSON icin `nvext.guided_json` uzantisi kullanilir. Gorsel uretimi (Stable Diffusion 3.5) ayri bir REST uc noktasidir, chat completions degil — bkz `create-content-ai/services/nvidia_service.py`.
- Detayli mimari referans: `docs/superpowers/specs/2026-08-19-create-content-design.md`

## Veritabani

Docker KULLANILMIYOR — native PostgreSQL (Homebrew `postgresql@15`) kullanilir.
Rol: `create_content`, DB: `create_content`, port `5432` (bkz `.env`).
Kurulum: `psql -U emrullah -d postgres -c "CREATE ROLE create_content WITH LOGIN PASSWORD '...' CREATEDB;"` ardindan `CREATE DATABASE create_content OWNER create_content;`.
Sema: `db-schemas/*.sql` dosyalarini sirayla `psql -U create_content -d create_content -f <dosya>` ile uygula.
