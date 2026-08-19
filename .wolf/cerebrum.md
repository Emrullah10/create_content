# Cerebrum — Kalici Hafiza

## User Preferences
- Turkce iletisim, Ingilizce icerik uretimi.
- Mimari find-job-mono-repo sablonuna (core/services/packages ayrimi, make* factory + container.js) birebir uymali.

## Key Learnings
- dev.to API: `accept: application/vnd.forem.api-v1+json` header'i zorunlu, auth `api-key` (Bearer degil), tag'ler sessizce sanitize edilir, `Retry-After` iki formatta gelir.
- Medium: yeni integration token verilmiyor (API repo'su Mart 2023'te arsivlendi) — PublisherPort iki adapter'a boluk (medium-api / medium-import).
- Gemini model adlari env'den okunur, koda gomulmez — modeller sik degisiyor.

## Do-Not-Repeat
(Henuz kayit yok.)

## Decision Log
- 2026-08-19: Tek-servisli monorepo varyanti secildi (core/service-content + services/create-content-service), service-discovery/gateway atlandi (bkz MONOREPO-ARCHITECTURE-TEMPLATE.md 12.2).
- 2026-08-19: Gorsel boru hatti icin placeholder+ayri diyagram dizisi deseni secildi — bir diyagramin render/upload hatasi tum makaleyi bozmasin diye.
