# Outline Prompt

You are outlining a technical article before drafting it.

Title: {{title}}
Angle: {{angle}}
Keywords: {{keywords}}

Produce:
- `sections`: an ordered list of section headings (5-8 sections, including an intro and conclusion).
- `key_points`: the concrete technical claims/facts each section must substantiate — no vague filler.
- `target_diagrams`: 2-4 short descriptions of what a Mermaid diagram should visualize at specific
  points in the article (e.g. "sequence diagram: client -> gateway -> service auth flow").

Output must match the Outline schema exactly.
