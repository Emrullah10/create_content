import { DiagramRepairSchema } from '../../../infrastructure/llm/schemas.js';
import { renderPrompt } from '../../../infrastructure/llm/prompt-loader.js';
import { extractDiagrams, embedAssets } from '../../../domain/article/markdown.js';
import { appendReferences } from '../../../domain/article/references.js';
import { makeAsk, completeStage } from '../../pipeline/common.js';

const MAX_REPAIR_ROUNDS = 2;
const diagramTypeOf = (source) => source.trim().split('\n')[0].trim().split(/\s+/)[0] || 'diagram';
const assetPath = (article, name, now) => `articles/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${article.articleSlug}/${name}.png`;

// GORSELLER: govdeki ```mermaid bloklari deterministik olarak yer tutucuya cevrilir; her diyagram gercek mermaid parser'iyla
// dogrulanir (hatada parser mesajiyla en fazla 2 tur LLM onarimi), PNG'ye render edilir ve GitHub'a yuklenir; kapak ayri uretilir.
// Bir gorselin hatasi makaleyi bozmaz: o asset `failed` olur, makale needs_assets'e duser ve panelden yeniden denenir.
// Bu use-case ayni zamanda yeniden-deneme yoludur: yalniz `uploaded` OLMAYAN asset'leri isler.
export const makePrepareAssets = ({ llm, renderer, imageGenerator, assetHost, articleRepo, assetRepo, revisionRepo, systemPrompt, nowFn = () => new Date() }) => {
  for (const [n, d] of Object.entries({ llm, renderer, imageGenerator, assetHost, articleRepo, assetRepo, revisionRepo })) if (!d) throw new Error(`makePrepareAssets requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });

  const validateAndRepair = async (source, articleId) => {
    let current = source;
    for (let round = 0; round < MAX_REPAIR_ROUNDS; round += 1) {
      const { valid, error } = await renderer.validateMermaid(current);
      if (valid) return { source: current, error: null };
      const { data } = await ask({ stage: 'diagram-repair', articleId, prompt: renderPrompt('diagram-repair', { diagram_type: diagramTypeOf(current), mermaid: current, error }), schema: DiagramRepairSchema, schemaName: 'diagram_repair', temperature: 0.1, maxTokens: 3000 });
      current = data.mermaid.replace(/^```(?:mermaid)?\n?|\n?```$/g, '').trim();
    }
    const finalCheck = await renderer.validateMermaid(current);
    return { source: current, error: finalCheck.valid ? null : finalCheck.error };
  };

  return async ({ articleId }) => {
    const article = await articleRepo.findById({ articleId });
    const now = nowFn();
    const metadata = article.articleMetadata || {};

    // Govdede mermaid blogu varsa taze cikar; yoksa (zaten gomulmus) kayitli sablondan yeniden gom.
    const extracted = extractDiagrams(article.articleBodyMarkdown || '');
    let template = metadata.templateMarkdown;
    if (extracted.diagrams.length) {
      template = extracted.markdown;
      for (const d of extracted.diagrams) await assetRepo.upsertDiagram({ articleId, key: d.key, sourceCode: d.source, altText: d.caption || `Diagram ${d.key.split('_')[1]}`, caption: d.caption });
    }
    if (!template) template = article.articleBodyMarkdown || '';
    template = appendReferences(template, article.articleResearchBrief, article.articleOutline); // idempotent; yeniden denemede de korunur
    const outline = article.articleOutline;
    if (outline?.coverPrompt) await assetRepo.upsertCover({ articleId, prompt: outline.coverPrompt });

    const errors = [];
    for (const asset of await assetRepo.listByArticle({ articleId, kind: 'diagram' })) {
      if (asset.status === 'uploaded') continue;
      try {
        const { source, error } = await validateAndRepair(asset.sourceCode, articleId);
        if (error) throw new Error(`mermaid syntax error (unrepaired after ${MAX_REPAIR_ROUNDS} rounds): ${error}`);
        const png = await renderer.renderMermaidToPng(source);
        const { url } = await assetHost.upload({ path: assetPath(article, asset.key.toLowerCase(), now), content: png, message: `asset: ${article.articleSlug}/${asset.key}` });
        await assetRepo.update({ assetId: asset.id, patch: { sourceCode: source, remoteUrl: url, status: 'uploaded', error: null } });
      } catch (e) {
        errors.push({ asset: asset.key, error: e.message });
        await assetRepo.update({ assetId: asset.id, patch: { status: 'failed', error: e.message } });
      }
    }

    let coverUrl = null;
    const cover = (await assetRepo.listByArticle({ articleId, kind: 'cover' }))[0];
    if (cover) {
      if (cover.status === 'uploaded') coverUrl = cover.remoteUrl;
      else {
        try {
          const png = await imageGenerator.generateCover(cover.sourceCode);
          ({ url: coverUrl } = await assetHost.upload({ path: assetPath(article, 'cover', now), content: png, message: `asset: ${article.articleSlug}/cover` }));
          await assetRepo.update({ assetId: cover.id, patch: { remoteUrl: coverUrl, status: 'uploaded', error: null } });
        } catch (e) {
          errors.push({ asset: 'cover', error: e.message });
          await assetRepo.update({ assetId: cover.id, patch: { status: 'failed', error: e.message } });
        }
      }
    }

    const diagrams = await assetRepo.listByArticle({ articleId, kind: 'diagram' });
    const embedded = embedAssets(template, diagrams.map((d) => ({ key: d.key, url: d.status === 'uploaded' ? d.remoteUrl : null, alt: d.altText, caption: d.caption })));
    const report = { ...(article.articleQualityReport || {}), assets: { diagrams: diagrams.length, uploaded: diagrams.filter((d) => d.status === 'uploaded').length, coverUploaded: Boolean(coverUrl), errors } };
    await completeStage(
      { articleRepo, revisionRepo },
      { articleId, stage: 'assets', patch: { bodyMarkdown: embedded, coverAssetId: cover?.id ?? null, qualityReport: report, metadata: { ...metadata, templateMarkdown: template } }, content: { ...report.assets } },
    );
    return { stage: 'assets', ...report.assets };
  };
};
