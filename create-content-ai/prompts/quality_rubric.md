# Quality Scoring Rubric

Score this article on FOUR criteria, each on a 0-5 scale. For each criterion, write the reasoning
FIRST, then the integer score — do not decide the number before you have written out the evidence.
Look for COUNTABLE evidence; do not give credit for a criterion just because the topic is technical.

Use these anchors for every criterion (write whole numbers only, no decimals):
- 0: absent — no evidence of this criterion at all.
- 1: token gesture — mentioned once, generically, with no specifics.
- 2: weak — present but vague; claims aren't concrete or are only partially developed.
- 3: adequate — competent and correct, but generic; a knowledgeable reader learns little new.
- 4: strong — specific, concrete evidence throughout; a knowledgeable reader learns something real.
- 5: exceptional — the kind of specificity and insight that could only come from direct experience.

## Criteria

**technical_depth** (weight 35%): concrete trade-offs ("X over Y costs Z", not "there are pros and
cons"), concrete failure scenarios (an error message, a specific broken behavior — not "this can
cause issues"), and claims traceable to the article's own evidence (not invented numbers — see
below). Count them; fewer than 2 of each caps this at 2.

**structural_richness** (weight 25%): diagrams present and meaningfully placed near the section
they illustrate, code blocks correct and runnable-looking (not `SELECT * FROM table` filler),
comparison table present, substantive length (1200+ words). Under 1000 words caps this at 2.

**clarity** (weight 20%): logical progression, scannable subheadings, no redundant filler, no
sentence or claim repeated near-verbatim elsewhere in the article.

**originality** (weight 20%): does the article take an explicit, arguable position and defend it,
including at least one counterpoint argued as a real position (stated, conceded, then rebutted) in
its own section? Scattered "however"/"on the other hand" hedges do NOT count. An article that only
explains "how X works" neutrally, without a defended position, caps this at 2.

## Fabricated numbers — always check for this

Numeric claims ("up to 25%", "reduces latency by 30%") are only legitimate if they trace to the
article's own stated experience/evidence or to a measurement shown in the article (e.g. an EXPLAIN
output, a benchmark table). An invented-sounding percentage with no traceable source is a
technical_depth defect, not a strength — do not reward "measurable-sounding" claims that are not
actually grounded. Flag any you notice in `weaknesses`.

## Calibration examples

**Weak article** (technical_depth=1, structural_richness=2, clarity=3, originality=1): "Database
indexes are important for performance. Adding an index can speed up your queries significantly.
However, too many indexes can slow down writes. It's a trade-off you need to consider." — No
concrete numbers, no specific failure mode, no defended position, just restates common knowledge.

**Strong article** (technical_depth=5, structural_richness=4, clarity=4, originality=4): "We added
a composite index on (tenant_id, created_at) to speed up a dashboard query. Write throughput on
that table dropped ~40% because every INSERT now updated two B-tree indexes instead of one. The
query planner also switched to an index scan for a query returning 60% of the table — slower than
a seq scan due to random I/O. We only caught it because p99 write latency alerts fired." — Specific
scenario, traceable number, concrete failure mode, mechanism explained.

Article:
{{article}}

Output the 8 reasoning+score field pairs (reasoning field always immediately before its score
field) plus `strengths` (2-4 bullets) and `weaknesses` (2-4 bullets, must include any fabricated
numbers you noticed). Be a harsh grader — a competent-but-generic article should score 2-3 on most
criteria, not 4-5.
