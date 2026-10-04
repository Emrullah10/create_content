Plan a technical article. It must defend ONE arguable position.

Title: {{title}}
Angle: {{angle}}
Keywords: {{keywords}}
Audience: {{target_audience}}

Author's notes (first-hand experience; the strongest source of originality, weave it in where it fits):
{{author_notes}}

SOURCE FACTS (the only external facts the article may state; reference them by id):
{{facts}}

Produce:
- title: final article title (you may sharpen the given one), subtitle (one line), summary (2 sentences), tags (3-4 lowercase alphanumeric dev.to tags, no hyphens).
- thesis: the position the article defends, in one or two sentences a reader could disagree with.
- sections: 6-8 sections in reading order.
  * First section: kind "intro" (hook + thesis, no heading shown), last: kind "conclusion". Exactly one section has kind "counterpoint" (a real objection stated, conceded in part, then rebutted); all others kind "body".
  * Each section: heading (specific, not "Introduction"), goal (what the reader must understand after it), factIds (ids from SOURCE FACTS to use, may be empty), targetWords (intro 120-180, conclusion 120-180, others 220-380), codePlan (null or {language, shows}: at least 4 body sections must have one; language one of javascript, typescript, python, bash, sql, json, yaml), diagramPlan (null or {type, shows}: exactly 2 or 3 sections in total; type one of flowchart, sequenceDiagram, erDiagram, stateDiagram-v2).
  * One body section must contain a comparison table (set tableHint to what it compares), all others tableHint null.
- coverPrompt: one sentence describing a clean editorial illustration for the cover (no text in the image).
Do not invent facts in the plan.
