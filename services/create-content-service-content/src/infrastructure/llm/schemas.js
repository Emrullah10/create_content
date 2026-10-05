import { z } from 'zod';

// LLM cikti semalari. Yapisal kurallar (superRefine) hata mesajiyla modele geri beslenir (adaptor tek duzeltme turu yapar).
const str = (max = 600) => z.string().trim().min(1).max(max);

export const TopicListSchema = z.object({
  topics: z.array(z.object({ title: str(160), angle: str(600), keywords: z.array(str(60)).min(1).max(8) })).min(1).max(30),
});

export const ResearchPlanSchema = z.object({
  queries: z.array(str(120)).max(6).default([]),
  docUrls: z.array(z.string().max(500)).max(8).default([]),
  wikipediaTitles: z.array(str(120)).max(4).default([]),
});

export const FactsSchema = z.object({ facts: z.array(z.object({ claim: str(400), quote: z.string().min(1).max(600) })).max(8) });

const CodePlan = z.object({ language: z.enum(['javascript', 'typescript', 'python', 'bash', 'sql', 'json', 'yaml']), shows: str(240) }).nullable();
const DiagramPlan = z.object({ type: z.enum(['flowchart', 'sequenceDiagram', 'erDiagram', 'stateDiagram-v2']), shows: str(240) }).nullable();

// Gorsel uretici (FLUX) metin/diyagram iceren istemleri bozuk yazilarla cizer: kapak istemi somut bir gorsel metafor olmali.
export const COVER_FORBIDDEN = /\b(diagram|flowchart|chart|graph|screenshot|screen|dashboard|code|text|label|caption|ui|interface|table)s?\b/i;

export const OutlineSchema = z
  .object({
    title: str(160),
    subtitle: str(240),
    summary: str(500),
    tags: z.array(str(30)).min(1).max(5),
    thesis: str(500),
    coverPrompt: str(400),
    sections: z
      .array(
        z.object({
          kind: z.enum(['intro', 'body', 'counterpoint', 'conclusion']),
          heading: str(140),
          goal: str(400),
          factIds: z.array(z.string()).max(10).default([]),
          targetWords: z.number().int().min(80).max(600),
          codePlan: CodePlan,
          diagramPlan: DiagramPlan,
          tableHint: z.string().max(240).nullable().default(null),
        }),
      )
      .min(5)
      .max(9),
  })
  .superRefine((o, ctx) => {
    const kinds = o.sections.map((s) => s.kind);
    const fail = (message) => ctx.addIssue({ code: 'custom', message });
    if (kinds[0] !== 'intro') fail('the first section must have kind "intro"');
    if (kinds[kinds.length - 1] !== 'conclusion') fail('the last section must have kind "conclusion"');
    if (kinds.filter((k) => k === 'counterpoint').length !== 1) fail('exactly one section must have kind "counterpoint"');
    if (kinds.filter((k) => k === 'intro').length !== 1 || kinds.filter((k) => k === 'conclusion').length !== 1) fail('exactly one intro and one conclusion are allowed');
    const diagrams = o.sections.filter((s) => s.diagramPlan).length;
    if (diagrams < 2 || diagrams > 3) fail(`exactly 2 or 3 sections must have a diagramPlan (found ${diagrams})`);
    if (o.sections.filter((s) => s.codePlan).length < 3) fail('at least 3 sections must have a codePlan');
    if (o.sections.filter((s) => s.tableHint).length < 1) fail('one section must have a tableHint');
    if (COVER_FORBIDDEN.test(o.coverPrompt)) fail('coverPrompt must be a concrete visual metaphor made of physical objects, shapes and light; it must not mention diagrams, charts, screens, code, text, labels or tables');
  });

export const EditorSchema = z.object({
  issues: z.array(z.object({ sectionHeading: str(160), problem: str(600), fix: str(600), severity: z.enum(['high', 'medium', 'low']) })).max(8),
});

const score = z.number().int().min(0).max(5);
export const JudgeSchema = z.object({
  technical_depth_reasoning: str(1200),
  technical_depth: score,
  structural_richness_reasoning: str(1200),
  structural_richness: score,
  clarity_reasoning: str(1200),
  clarity: score,
  originality_reasoning: str(1200),
  originality: score,
  strengths: z.array(str(300)).min(1).max(5),
  weaknesses: z.array(str(300)).min(1).max(6),
});

export const CodeFixSchema = z.object({ code: z.string().min(1) });
export const DiagramRepairSchema = z.object({ mermaid: z.string().min(5) });
