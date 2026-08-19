# Draft Prompt

Write a complete, publication-ready technical article in English based on this outline.

Title: {{title}}
Outline: {{outline}}

MANDATORY structural requirements (this is graded, not optional):
- TARGET LENGTH: 1200-1800 words in `body_markdown`. This is a hard requirement — an article
  under 1000 words is considered incomplete and will be rejected. Develop each outline section
  with real depth: explain the *why*, not just the *what*; include concrete scenarios, trade-offs,
  and edge cases. Do not pad with filler — add substance.
- At least 2 Mermaid diagrams. Do NOT inline Mermaid code in body_markdown — instead, insert a
  placeholder token `{{DIAGRAM_1}}`, `{{DIAGRAM_2}}`, etc. exactly where each diagram belongs, and
  provide the actual Mermaid source in the separate `diagrams` array, matched by `key`.
- At least 3 syntax-highlighted code blocks (use proper language tags, e.g. ```javascript).
- At least 1 comparison table (before/after, or option A vs option B) in Markdown table syntax.
- Use concrete, working code examples — no pseudo-code unless explicitly illustrating an anti-pattern.
- Write for a technical reader who will skim first — use clear subheadings, short paragraphs, but
  thorough sections (skimmable structure, not skimpy content).
- `cover_prompt`: a vivid, concrete visual description (not article title repeated) for an AI-generated
  cover image — describe a scene/metaphor/composition, not text-in-image.
- `tags`: 3-5 lowercase tags relevant to dev.to conventions (single words or camelCase-free compound words).

Output must match the ArticleDraft schema exactly. Every {{DIAGRAM_N}} placeholder used in
body_markdown MUST have a corresponding entry in `diagrams`.
