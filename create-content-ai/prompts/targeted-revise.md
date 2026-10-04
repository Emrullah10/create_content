# Targeted Quality Revision

This article scored {{overall_score}}/100 against a harsh quality rubric and needs to reach
{{threshold}}+ before it can be approved. You are given the exact scoring breakdown — use it
to decide what to fix. Do not guess at generic improvements; fix what the rubric actually
penalized.

Article:
{{article}}

Scoring breakdown (0-5 per criterion, reasoning explains WHY that score was given):
{{score_breakdown}}

Weaknesses the grader flagged:
{{weaknesses}}

## Priority

`technical_depth` is weighted 35% — the single highest-weight criterion, and by far the most
effective lever for raising the total score. If `technical_depth` scored below 4, prioritize it
above everything else: add at least 3 concrete trade-offs ("X over Y costs Z", not "there are
pros and cons") and at least 3 concrete failure scenarios (an actual error message or a specific
broken behavior, not "this can cause issues"). Count them yourself before finishing — fewer than
3 of each is why the score is stuck.

If `structural_richness` scored below 4, check the article has **at least 3 syntax-highlighted
code blocks** and a comparison table — this is a hard structural requirement, not a style
preference, and articles with only 2 code blocks are capped regardless of prose quality.

If `originality` scored below 4, make sure the counterpoint section states the strongest form of
the opposing position, concedes what's true about it, then rebuts it — a neutral "how X works"
explanation with scattered hedges does not count as a defended position.

## Hard rules (same as every revision pass)

- The revised article must stay at or above its current length. Do NOT shorten or "tighten"
  sections — expand thin ones instead.
- Keep every code block; if one is buggy, fix it in place, never delete it.
- Keep every embedded image (`![...](...)`) exactly where it is — these are already-uploaded
  diagrams, not placeholders. Do not remove, reorder, or replace them.
- NEVER invent a statistic. Only use a number grounded in the article's own experience notes or
  example. If you find a fabricated-sounding percentage from a prior draft, remove it or replace
  it with the qualitative mechanism it stood in for.

Output the fully revised `body_markdown` + `summary`, plus a `changes` list (2-5 bullets) of
what you specifically changed and why, tied to the weaknesses above.
