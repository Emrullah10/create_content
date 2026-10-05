Rewrite ONE section of a technical article to fix the listed issues. Keep what works.

Article title: {{title}}
Thesis: {{thesis}}
Section heading: {{heading}}

Issues to fix in this section:
{{issues}}

SOURCE FACTS you may rely on (no other external facts, no invented numbers):
{{facts}}

Current section body:
"""
{{body}}
"""

- Never output fact ids such as [F3] or footnote markers such as [^F3] or [^1]. Cite a source only with an inline markdown link to one of the listed URLs.
Rules: never output fact ids such as [F3] or footnote markers such as [^F3]; cite only with inline markdown links. Output only the rewritten section body in Markdown (no heading). Keep every code block and mermaid block unless an issue says to change it; keep the `*Figure: ...*` caption after each diagram. Keep the length within -10% / +30% of the current body. Do not add clichés or filler. Do not add statistics that are not in SOURCE FACTS or already in the current body.
