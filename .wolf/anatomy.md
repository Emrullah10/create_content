# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-08-20T11:12:35.508Z
> Files: 45 tracked | Anatomy hits: 0 | Misses: 0

## ../../../.claude/plans/

- `imdi-ben-dev-com-hemde-squishy-teapot.md` — Kalite skorunu yükseltme planı (~2434 tok)
- `resimlerin-kapak-resimide-dahil-zesty-hamming.md` — Derin iyileştirme: skor çapası, yazı kalitesi, görseller (~2203 tok)

## ./

- `.gitignore` — Git ignore rules (~70 tok)
- `package.json` — Node.js package manifest (~306 tok)

## .vscode/

- `launch.json` (~337 tok)

## core/service-content/src/application/orchestrators/

- `daily-content.orchestrator.js` — Gunluk boru hatti: sirada konu -> taslak -> oz-elestiri -> diyagram render -> upload -> gomme -> sko (~444 tok)

## core/service-content/src/application/ports/

- `ai.port.js` — Exports AI_PORT_METHODS (~265 tok)

## core/service-content/src/application/use-cases/article/

- `critique-and-revise.use-case.js` — Exports makeCritiqueAndRevise (~486 tok)
- `draft-article.use-case.js` — Exports makeDraftArticle (~505 tok)
- `score-article.use-case.js` — Exports makeScoreArticle (~275 tok)

## core/service-content/src/application/use-cases/asset/

- `embed-assets.use-case.js` — Placeholder'lari ({{DIAGRAM_N}}) markdown img+caption ile degistirir. (~418 tok)
- `render-diagrams.use-case.js` — Exports makeRenderDiagrams (~216 tok)

## core/service-content/src/application/use-cases/theme/

- `update-theme.use-case.js` — Exports makeUpdateTheme (~150 tok)

## core/service-content/src/domain/entities/

- `article.js` — Exports REQUIRED_MIN_DIAGRAMS, REQUIRED_MIN_CODE_BLOCKS, makeArticle, countCodeBlocks + 2 more (~239 tok)

## core/service-content/src/domain/policies/

- `quality-policy.js` — AI'in kendi skoruna guvenmek yetmiyor — draft.md 1200-1800 kelime hedefliyor ama (~188 tok)

## core/service-content/src/infrastructure/ai/

- `ai-client.js` — core/service-content/src/infrastructure/ai/ai-client.js (~791 tok)

## core/service-content/src/infrastructure/helper/

- `markdown-utils.js` — Exports replacePlaceholder (~30 tok)
- `retry.js` — Exports withRetry (~122 tok)

## core/service-content/src/infrastructure/persistence/repositories/

- `article.repository.js` — Exports makeArticleRepository (~486 tok)
- `theme.repository.js` — Exports makeThemeRepository (~356 tok)

## core/service-content/src/infrastructure/persistence/schemas/

- `table-definitions.js` — JS karsiligi db-schemas/*.sql ile senkron tutulur (scripts/build-schema.js). (~554 tok)

## core/service-content/src/infrastructure/publishers/

- `devto.publisher.js` — dev.to (Forem API v1) publisher. (~611 tok)

## core/service-content/src/infrastructure/renderer/

- `mermaid-renderer.js` — Puppeteer ile yerel bir HTML icine gomulu Mermaid'i render edip PNG uretir. (~580 tok)

## core/service-content/src/interfaces/http/controllers/

- `theme.controller.js` — Exports makeThemeController (~111 tok)

## create-content-ai/

- `main.py` — API: 8 endpoints (~1108 tok)

## create-content-ai/prompts/

- `cover_image.md` (~49 tok)
- `critique.md` — Critique & Revise Prompt (~404 tok)
- `draft.md` — Draft Prompt (~1273 tok)
- `expand.md` — Expand Prompt (~548 tok)
- `outline.md` — Outline Prompt (~447 tok)
- `quality_rubric.md` — Quality Scoring Rubric (~970 tok)

## create-content-ai/services/

- `experience_service.py` — Ozgunluk kaynagi: AI'in genel bilgisi disinda, bu projede gercekten yasanmis (~861 tok)
- `nvidia_service.py` — NVIDIA NIM (build.nvidia.com) client — Gemini'nin yerini alir (metin). (~2818 tok)

## create-content-ai/utils/

- `mermaid_guard.py` — Mermaid sozdiziminin en temel seviyede gecerli olup olmadigini kontrol eder. (~267 tok)
- `schema.py` — Pydantic response semalari — NVIDIA NIM guided_json structured output icin. (~363 tok)

## create-content-web/src/api/

- `themes.js` — API routes: GET, POST, PATCH (4 endpoints) (~118 tok)

## create-content-web/src/features/articles/

- `ArticleDetailPage.jsx` — ArticleDetailPage (~1040 tok)

## create-content-web/src/features/themes/

- `ThemesPage.jsx` — ThemeExpertiseNotes (~863 tok)

## create-content-web/src/features/themes/hooks/

- `useThemes.js` — Exports useThemes, useCreateTheme, useToggleTheme, useUpdateTheme (~300 tok)

## db-schemas/

- `01-theme-schema.sql` — Icerik nisleri: kullanici tema girer, AI bunu topic'lere acar (bkz 02-topic-schema.sql) (~168 tok)
- `03-article-schema.sql` — Makaleler ve AI gecis gecmisi (her asama: outline/draft/critique/revised/final) (~386 tok)

## packages/modules/config/

- `index.js` — Exports appConfig, aiConfig, publisherConfig, assetHostConfig, contentConfig (~329 tok)

## services/create-content-service/routes/

- `index.js` — API routes: POST, GET, PATCH (14 endpoints) (~984 tok)

## services/create-content-service/src/

- `container.js` — Composition root: tum use-case'ler burada elle "wire" edilir. (~2635 tok)

## test/services/service-content/unit/

- `quality-policy.test.js` — Declares makeBody (~389 tok)
