# Draft Prompt

Write a complete, publication-ready technical article in English based on this outline. This is
graded harshly on technical depth and originality — a well-formatted generic tutorial still scores
low. Your job is to argue the outline's `core_thesis`, not just describe the topic.
{{experience_context}}

Title: {{title}}
Outline: {{outline}}

MANDATORY structural requirements (this is graded, not optional):
- TARGET LENGTH: 1200-1800 words in `body_markdown`. This is a hard requirement — an article
  under 1000 words is considered incomplete and will be rejected. A global word count is easy to
  underestimate, so apply this PER SECTION instead: write EACH section in the outline as its own
  200-300 word passage before moving to the next one. An outline with 6 sections at ~250 words
  each already reaches the 1500-word target — treat every heading as its own mini-essay with an
  intro sentence, 2-3 developed points (concrete scenarios, trade-offs, edge cases), and a
  transition, not a 2-3 sentence summary. Do not pad with filler — add substance per section.
- The outline's `core_thesis` must be stated explicitly, ideally in the intro, and the rest of the
  article must argue FOR it with evidence — not just describe the general topic neutrally.
- Every entry in the outline's `tradeoffs` must appear as a concrete, specific comparison in the
  body (a table or a clearly-labeled paragraph naming what was gained and what was given up) —
  not softened into generic "there are pros and cons" language.
- Every entry in `failure_scenarios` must appear as a concrete example: an error message, a
  benchmark number, or a specific broken behavior — not a vague warning.
- NEVER invent a statistic ("up to 25% increase", "reduces latency by 30%"). Only state a number
  if it comes from the experience notes above or is something you show the mechanism for in the
  article itself (e.g. you walk through why it happens). If you don't have a real number, describe
  the mechanism and direction of the effect instead of making up a percentage — a fabricated
  "measurable-sounding" claim is worse than an honest qualitative one and will be penalized.
- Weave concrete evidence into natural prose. NEVER write labeled-statement phrases like "A
  concrete trade-off is...", "A specific failure scenario is...", or "A deeper mechanical
  explanation is..." — these read as a form being filled out, not an article, and score low on
  clarity. State the trade-off/scenario/mechanism as part of the sentence, not announced first.
- Include a DEDICATED subheading (e.g. "When this doesn't apply" / "The other side") addressing at
  least one `counterpoint` from the outline. Do NOT scatter "however"/"on the other hand" hedges
  through unrelated paragraphs — that reads as generic hedging, not a real counterpoint, and scores
  low on originality. In this section: (1) state the strongest form of the counterpoint as if
  argued by a skeptic, (2) concede what is genuinely true about it, (3) explain specifically why
  the core_thesis still holds anyway (or under what narrower condition it doesn't). This is what
  separates the article from a generic tutorial.
- At least 2 Mermaid diagrams. Do NOT inline Mermaid code in body_markdown — instead, insert a
  placeholder token `{{DIAGRAM_1}}`, `{{DIAGRAM_2}}`, etc. exactly where each diagram belongs, and
  provide the actual Mermaid source in the separate `diagrams` array, matched by `key`.
  Mermaid edge labels MUST use the form `-->|Label|` — NEVER `-->|Label|>` (the trailing `>` is
  invalid syntax and renders as a broken diagram). Correct: `A -->|Request| B`. Wrong: `A -->|Request|> B`.
  Place each placeholder INLINE inside the body of the section it illustrates — never as its own
  heading (do NOT write "# Diagram 1: ..." as a section), and never after the Conclusion section.
  The last placeholder must not fall in the final 20% of the article.
- At least 3 syntax-highlighted code blocks (use proper language tags, e.g. ```javascript), and
  this is easy to underdeliver on — apply the same per-section discipline as the word count: as you
  write each section, ask "does this section have a concrete code example?" and include one for at
  least 3 of the sections, not all 3 crammed into one section.
- At least 1 comparison table (before/after, or option A vs option B) in Markdown table syntax.
- Use concrete, working code examples — no pseudo-code unless explicitly illustrating an anti-pattern.
- Write for a technical reader who will skim first — use clear subheadings, short paragraphs, but
  thorough sections (skimmable structure, not skimpy content).
- `cover_prompt`: a vivid, concrete visual description (not article title repeated) for an AI-generated
  cover image — describe a scene/metaphor/composition, not text-in-image.
- `tags`: 3-5 lowercase tags relevant to dev.to conventions (single words or camelCase-free compound words).

Output must match the ArticleDraft schema exactly. Every {{DIAGRAM_N}} placeholder used in
body_markdown MUST have a corresponding entry in `diagrams`.
