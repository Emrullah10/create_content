Write ONE section of a technical article in Markdown.

Article title: {{title}}
Thesis (the article defends this): {{thesis}}
Section {{position}} of {{total}}: "{{heading}}" (kind: {{kind}})
Goal of this section: {{goal}}
Target length: about {{target_words}} words (stay within +/-20%).

Outline of the whole article (so you do not repeat other sections):
{{outline_summary}}

The previous section ended with:
"""
{{previous_tail}}
"""

SOURCE FACTS for this section (state only these external facts; do not add others):
{{facts}}

Sources you may link to (use markdown links only to these exact URLs, link a source at most once, only where it genuinely helps):
{{sources}}

Author's first-hand notes (use where relevant, in first person, do not exaggerate them):
{{author_notes}}

Code requirement: {{code_plan}}
Diagram requirement: {{diagram_plan}}
Table requirement: {{table_hint}}

Hard rules:
- Output only the section body in Markdown. Do NOT output the section heading; it is added for you. No preface, no "Here is".
- Never output fact ids such as [F3] or footnote markers such as [^F3] or [^1]. Cite a source only with an inline markdown link to one of the listed URLs.
- No filler openers, no clichés ("delve", "game-changer", "in today's fast-paced world", "unlock the power").
- Every number, percentage, benchmark or error message must come from SOURCE FACTS, the author's notes, or be visible in your own code/output listing. Otherwise describe it qualitatively. Never invent statistics.
- Code: complete, minimal, syntactically valid snippets in fenced blocks with a language tag. Real APIs only; no placeholder ellipses inside code.
- Diagram: a fenced ```mermaid block placed right where it is discussed, then on the next line a caption in the form `*Figure: <one sentence>*`. Mermaid syntax: node and participant ids without spaces (`QP[Query Planner]`, `participant QP as Query Planner`); edge labels as `-->|Label|` (never a trailing `>`); in erDiagram, relationship labels after the last `:` are one unquoted word or a double-quoted string, never single quotes and never an SQL keyword; every erDiagram entity needs attributes.
- For kind "counterpoint": state the strongest objection fairly, concede what is true in it, then rebut with a concrete argument; do not hedge elsewhere.
- For kind "intro": open with a concrete situation or claim, state the thesis by the third paragraph, no table of contents.
- For kind "conclusion": a decision rule or checklist the reader can apply, not a summary.
