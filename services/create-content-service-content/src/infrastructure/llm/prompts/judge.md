# Quality Scoring Rubric

Score this article on FOUR criteria, each on a 0-5 scale. For each criterion, write the reasoning
FIRST, then the integer score; do not decide the number before you have written out the evidence.
Look for COUNTABLE evidence; do not give credit just because the topic is technical.

Anchors (whole numbers only):
- 0: absent. - 1: token gesture, generic. - 2: weak, vague. - 3: adequate but generic; a knowledgeable reader learns little new. - 4: strong, specific, concrete throughout. - 5: exceptional, only possible from direct experience.

## Criteria
**technical_depth** (35%): concrete trade-offs ("X over Y costs Z"), concrete failure scenarios (an error, a specific broken behaviour), and claims traceable to the article's own evidence or listed sources. Count them; fewer than 2 of each caps this at 2.
**structural_richness** (25%): diagrams placed next to the section they illustrate, correct code, comparison table, substantive length. Under 1000 words caps this at 2.
**clarity** (20%): logical progression, scannable headings, no filler, nothing repeated near-verbatim.
**originality** (20%): an explicit, arguable position that is defended, including one counterpoint argued as a real position (stated, conceded, rebutted) in its own section. Scattered "however" hedges do NOT count. A neutral "how X works" caps this at 2.

## Fabricated numbers
A numeric claim is legitimate only if it traces to the sources listed below, to a measurement shown in the article, or to first-hand notes. An invented-sounding figure is a technical_depth defect. List any in `weaknesses`.

## Calibration
Weak (depth 1, structure 2, clarity 3, originality 1): "Database indexes are important. Adding an index can speed up queries. However, too many indexes slow writes. It's a trade-off." No specifics, no failure mode, no position.
Strong (depth 5, structure 4, clarity 4, originality 4): "We added a composite index on (tenant_id, created_at) for a dashboard query. Every INSERT now maintained two B-tree indexes, and the planner chose an index scan for a query returning most of the table, which was slower than a sequential scan because of random I/O. We found out because p99 write latency alerted." Specific scenario, mechanism, failure mode, no unexplained numbers.

Sources the article may rely on:
{{sources}}

Article title: {{title}}

Article:
{{article}}

Output the four reasoning+score pairs (reasoning immediately before its score), plus `strengths` (2-4) and `weaknesses` (2-4, include any fabricated numbers). Be a harsh grader: a competent but generic article scores 2-3.
