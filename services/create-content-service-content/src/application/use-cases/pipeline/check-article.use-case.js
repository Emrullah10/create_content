import { runQualityChecks } from '../../../domain/article/quality-checks.js';
import { assembleBody } from '../../../domain/article/section-markdown.js';
import { extractLinks, removeLink } from '../../../domain/article/markdown.js';
import { allowedTextOf } from '../../../domain/research/facts.js';
import { makeAsk, loadContext, completeStage, authorNotesText } from '../../pipeline/common.js';
import { makeCodeFixer } from '../../pipeline/code-fixer.js';

// KONTROL: (1) kod bloklari sozdizimi dogrulanir ve hatalilar duzeltilir, (2) kaynak listesinde OLMAYAN linkler canli mi diye
// denenir ve kirik olanlar metinden cikarilir, (3) deterministik kalite kontrolleri kosulur. Sonuc rapora yazilir.
export const makeCheckArticle = ({ llm, checkCode, linkChecker, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo, thresholds = {}, systemPrompt, nowFn }) => {
  for (const [n, d] of Object.entries({ llm, checkCode, linkChecker, articleRepo, topicRepo, themeRepo, sectionRepo, revisionRepo })) if (!d) throw new Error(`makeCheckArticle requires { ${n} }`);
  const ask = makeAsk({ llm, system: systemPrompt });
  const fixCode = makeCodeFixer({ ask, checkCode, sectionRepo, nowFn });

  return async ({ articleId }) => {
    const ctx = await loadContext({ articleRepo, topicRepo, themeRepo, sectionRepo }, articleId);
    const { brief, topic, theme } = ctx;

    const code = await fixCode({ articleId, sections: ctx.sections });
    let sections = code.sections;

    // Linkler: arastirmada zaten cekilmis (dogrulanmis) kaynaklar agsiz gecer; digerleri denenir.
    const trusted = new Set((brief?.sources || []).map((s) => s.url));
    const urls = [...new Set(sections.flatMap((s) => extractLinks(s.body)))];
    const toCheck = urls.filter((u) => !trusted.has(u));
    const checked = toCheck.length ? await linkChecker.checkAll(toCheck) : [];
    const broken = checked.filter((c) => !c.ok);
    if (broken.length) {
      sections = sections.map((s) => ({ ...s, body: broken.reduce((b, c) => removeLink(b, c.url), s.body) }));
      for (const s of sections) await sectionRepo.setBody({ sectionId: s.id, body: s.body, wordCount: s.body.split(/\s+/).length, now: nowFn?.() ?? new Date() });
    }
    const links = { total: urls.length, trusted: urls.length - toCheck.length, checked: checked.length, broken: broken.map((b) => ({ url: b.url, reason: b.reason })), unverified: checked.filter((c) => c.unverified).map((c) => c.url) };

    const body = assembleBody(sections);
    const allowedText = allowedTextOf(brief, authorNotesText({ topic, theme }));
    const checks = runQualityChecks({ body, allowedText, thresholds });
    const report = { ...(ctx.article.articleQualityReport || {}), checks: { passed: checks.passed, items: checks.checks, metrics: checks.metrics }, code: code.summary, links };

    await completeStage({ articleRepo, revisionRepo }, { articleId, stage: 'check', patch: { bodyMarkdown: body, qualityReport: report }, content: { checks: checks.checks.filter((c) => !c.ok), code: code.summary, links } });
    return { stage: 'check', passed: checks.passed, errors: checks.errors.map((e) => e.id), codeFailures: code.summary.failed, brokenLinks: broken.length };
  };
};
