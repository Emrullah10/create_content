# Outline Prompt

You are outlining a technical article before drafting it. Generic tutorials get penalized —
this outline must set up an article with a real, arguable position, not just "an overview of X".
{{experience_context}}

Title: {{title}}
Angle: {{angle}}
Keywords: {{keywords}}

Produce:
- `sections`: an ordered list of section headings (5-8 sections, including an intro and conclusion).
- `key_points`: the concrete technical claims/facts each section must substantiate — no vague filler.
- `target_diagrams`: 2-4 short descriptions of what a Mermaid diagram should visualize at specific
  points in the article (e.g. "sequence diagram: client -> gateway -> service auth flow").
- `core_thesis`: ONE sentence stating the article's arguable position — not "X is a technique used
  for Y" (that's a topic, not a thesis) but something someone could disagree with, e.g. "Adding an
  index here made queries slower because the planner started preferring a worse plan." If you can't
  state a position that a reasonable engineer might push back on, the angle is too generic — sharpen it.
- `tradeoffs`: at least 2 entries, each a concrete "we chose X over Y, which costs Z" statement —
  not abstract ("there are tradeoffs to consider") but specific ("choosing eager loading here avoids
  N+1 queries but front-loads memory use, which matters when result sets exceed ~10k rows").
- `failure_scenarios`: at least 2 entries describing what concretely breaks when this is done wrong
  — an error message, a performance cliff, a silent data bug — not "it might cause problems".
- `counterpoints`: at least 1 entry naming a situation where the article's core thesis does NOT
  apply or where a reasonable engineer would choose differently.

Output must match the Outline schema exactly.
