# Create Content

Temalardan konu üretir, her konu için kaynaklara dayalı bir teknik makale yazar (kod ve diyagram doğrulamalı), kapak görseli hazırlar ve **siz onayladıktan sonra** dev.to'ya yayınlar; Medium'a içe aktarma bağlantısı verir. Hiçbir şey onayınız olmadan yayınlanmaz.

Mimari: `docs/ARCHITECTURE.md` (şablon v2.0, tek servisli varyant). Kararlar: `docs/DECISIONS.md`.

## Hızlı başlangıç

```bash
npm ci
cp .env.example .env            # anahtarları doldurun (NVIDIA, Cloudflare, GitHub, dev.to)
npm run check:llm               # hangi modellere GERÇEKTEN erişebildiğinizi gösterir
npm run build-schema && psql -U create_content -d create_content -f db-schemas/_combined.sql   # ilk kurulum
npm run dev:backend             # PM2: servis 127.0.0.1:3100
npm run dev:local               # panel 127.0.0.1:5174
```

Veritabanı: native PostgreSQL 15 (Docker yok). Rol ve veritabanı için `db-schemas/A00-bootstrap-database.sql`.

## Günlük akış

1. **Temalar** sayfasında nişlerinizi ve (varsa) uzmanlık notlarınızı girin.
2. **Konular** sayfasında yapay zekâdan öneri isteyin; beğendiğinizi **kendi notunuzla** onaylayın (özgünlüğün en etkili girdisi).
3. Her gün `DAILY_CRON` saatinde (ya da **Şimdi yaz** ile) sıradaki onaylı konu yazılır: araştırma → outline → bölüm bölüm taslak → kontroller → redaktör/revizyon → kör hakem → diyagram/kapak.
4. **Makaleler** sayfasında rapora bakın, düzenleyin, onaylayın.
5. **Yayın** sekmesinden dev.to taslağı ya da canlı yayın. Canlıdan sonra Medium içe aktarma bağlantısı açılır; Medium adresini panele yapıştırın.

## Kalite nasıl sağlanıyor

- Araştırma: resmi dokümanlar, GitHub README, Stack Exchange, Wikipedia. Olgunun alıntısı kaynak metinde **birebir** geçmiyorsa kodla atılır.
- Kaynaksız sayı/yüzde, klişe, tekrar, eksik kod/diyagram/tablo deterministik kontrollerle yakalanır ve ilgili bölüm yeniden yazılır.
- Makaledeki kod yalnızca **sözdizimi** için doğrulanır, asla çalıştırılmaz. Kırık linkler ayıklanır.
- Hakem önceki skoru görmez; 3 örneğin kriter başına medyanı alınır, toplam kodda hesaplanır; otomatik kontroller başarısızsa skor sınırlanır.

## Modeller

Roller `.env` ile ayarlanır (`LLM_WRITER_*`, `LLM_JUDGE_*`, `LLM_UTILITY_*`; OpenAI uyumlu herhangi bir uç nokta). Varsayılan: NVIDIA NIM — yazar `nemotron-3-ultra-550b`, hakem/yardımcı `nemotron-3-super-120b`. Model listesi sık değişir (`meta/llama-3.3-70b-instruct` 2026-08-26'da kaldırıldı); `npm run check:llm` ile doğrulayın.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm test` | backend + web testleri (worker başına ayrı test DB'si) |
| `npm run test:fast` | test DB'lerini yeniden kullanır (şema değişince kendiliğinden yeniler) |
| `npm run test:e2e` | Docker'sız Playwright E2E (ayrı DB, sahte LLM/yayıncı) |
| `npm run lint` | backend ESLint (panel için `cd create-content-web-app && npx eslint .`) |
| `npm run migrate:status` / `migrate` | migration defteri |
| `npm run gen:table-defs` | `core/service-content` table-definitions'ı DB'den üretir |
| `npm run update` | **sunucuda**: çek → build → migration → pm2 |

## Sunucu

```
~/services/create-content/
├── create-content-mono-repo/   # git clone
└── env/ .env (chmod 600) · migration.env · keys/
```

`npm run update` (build → migration → pm2). Panel statik olarak `create-content-web-app/dist` altından, `/api` servise proxy'lenerek sunulur. Giriş: `.env`'de `PANEL_PASSWORD` tanımlıysa panel parola ister (HttpOnly cerez, 7 gün); boşsa giriş yoktur (yerel). Sunucuda mutlaka `PANEL_PASSWORD`, `ALLOWED_HOSTS` ve `PANEL_ORIGINS` verin, TLS'i nginx sonlandırsın ve `Host` başlığını iletsin.

## Sorun giderme

- Port dolu: `lsof -nP -iTCP:3100 -sTCP:LISTEN`; eski süreç kilit tutuyorsa iş "başka pipeline çalışıyor" diye atlanır.
- Yazım yarıda kaldı: servis yeniden başlayınca makale `failed` olur; **Devam et** kaldığı aşamadan sürdürür.
- Görsel yüklenmedi: makale `needs_assets` olur; **Görselleri yeniden dene**.
