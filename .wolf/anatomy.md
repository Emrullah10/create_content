# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-08-19T14:26:35.365Z
> Files: 22 tracked | Anatomy hits: 0 | Misses: 0

## ../../../.claude/plans/

- `imdi-ben-dev-com-hemde-squishy-teapot.md` — Kapak görseli görünürlüğü + makale uzunluğu düzeltmesi (~1792 tok)

## ./

- `.gitignore` — Git ignore rules (~70 tok)
- `package.json` — Node.js package manifest (~306 tok)

## .vscode/

- `launch.json` (~337 tok)

## core/service-content/src/application/orchestrators/

- `daily-content.orchestrator.js` — Gunluk boru hatti: sirada konu -> taslak -> oz-elestiri -> diyagram render -> upload -> gomme -> sko (~444 tok)

## core/service-content/src/application/use-cases/article/

- `draft-article.use-case.js` — Exports makeDraftArticle (~462 tok)

## core/service-content/src/application/use-cases/asset/

- `render-diagrams.use-case.js` — Exports makeRenderDiagrams (~216 tok)

## core/service-content/src/domain/entities/

- `article.js` — Exports REQUIRED_MIN_DIAGRAMS, REQUIRED_MIN_CODE_BLOCKS, makeArticle, countCodeBlocks + 2 more (~239 tok)

## core/service-content/src/domain/policies/

- `quality-policy.js` — AI'in kendi skoruna guvenmek yetmiyor — draft.md 1200-1800 kelime hedefliyor ama (~188 tok)

## core/service-content/src/infrastructure/ai/

- `ai-client.js` — core/service-content/src/infrastructure/ai/ai-client.js (~619 tok)

## core/service-content/src/infrastructure/helper/

- `markdown-utils.js` — Exports replacePlaceholder (~30 tok)
- `retry.js` — Exports withRetry (~122 tok)

## core/service-content/src/infrastructure/persistence/repositories/

- `article.repository.js` — Exports makeArticleRepository (~486 tok)

## core/service-content/src/infrastructure/publishers/

- `devto.publisher.js` — dev.to (Forem API v1) publisher. (~611 tok)

## create-content-ai/

- `main.py` — API: 7 endpoints (~961 tok)

## create-content-ai/prompts/

- `critique.md` — Critique & Revise Prompt (~264 tok)
- `draft.md` — Draft Prompt (~433 tok)
- `quality_rubric.md` — Quality Scoring Rubric (~214 tok)

## create-content-ai/services/

- `nvidia_service.py` — NVIDIA NIM (build.nvidia.com) client — Gemini'nin yerini alir (metin). (~1926 tok)

## create-content-web/src/features/articles/

- `ArticleDetailPage.jsx` — ArticleDetailPage (~1040 tok)

## packages/modules/config/

- `index.js` — Exports appConfig, aiConfig, publisherConfig, assetHostConfig, contentConfig (~329 tok)

## test/services/service-content/unit/

- `quality-policy.test.js` — Declares makeBody (~389 tok)
