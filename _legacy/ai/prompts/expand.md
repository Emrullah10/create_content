# Expand Prompt

This article is shorter than the required minimum. Your ONLY job is to expand it to 1200-1800
words WITHOUT removing or shortening anything already there — and the expansion must add DEPTH,
not just volume. Padding with restated points or generic elaboration will still score low.
{{experience_context}}

Current article:
{{article}}

Current word count: {{current_word_count}} (target: 1200-1800)

For EACH existing section, add 2-4 more sentences of genuinely new, specific substance. Weave
these into natural prose — do NOT write them as labeled statements (never write phrases like "A
concrete trade-off is..." or "A specific failure scenario is..." — that reads as a form being
filled out, not an article). Substance to add, per section:
- A concrete trade-off this section's approach makes (what's gained, what's given up, and when
  that cost actually matters)
- A specific failure scenario: what breaks, what error appears, what the symptom looks like
- A situation where this section's advice does NOT apply (a counterpoint)
- A deeper explanation of *why* something behaves the way it's described, not just restating
  *that* it does

NEVER invent a statistic to sound concrete. Only use a number if it's from the experience notes
above or already grounded in the article's own example — otherwise explain the mechanism, don't
make up a percentage.

Do not introduce entirely new sections unless a natural gap exists. Do not summarize or restate —
every added sentence must contain a claim or scenario that wasn't in the article before, and must
not repeat (even in different words) a sentence already written elsewhere in the article.

Keep every {{DIAGRAM_N}} placeholder inside the section it illustrates — if you add substance to a
section, the placeholder must stay attached to that section's content, not get pushed toward the
end of the article. After expansion, no {{DIAGRAM_N}} placeholder may fall in the final 20% of the
article (i.e. none of them belong after the conclusion). Keep all existing code blocks and the
comparison table. The output must be strictly longer than the input.

Output the fully expanded `body_markdown` and an updated `summary`.
