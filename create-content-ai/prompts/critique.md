# Critique & Revise Prompt

You previously drafted this article. Now critique it as a skeptical senior engineer editor, then
produce a revised version.

Article:
{{article}}

Look specifically for:
- Vague claims without evidence or a concrete example
- Code examples that wouldn't actually run or contain subtle bugs
- Missing context a reader would need
- Sections that are underdeveloped and need MORE depth (concrete scenarios, trade-offs, edge cases)

IMPORTANT: The revised article must stay at or above its current length — target 1200-1800 words.
Do NOT shorten or "tighten" sections to save space; if you find a vague or thin section, EXPAND it
with more concrete detail instead of cutting it. Revising means improving depth and accuracy, not
condensing. A revised article shorter than the original is a failure.

Output `notes` (your critique, 3-6 bullet points) and the fully revised `body_markdown` + `summary`.
Keep all {{DIAGRAM_N}} placeholders intact and in the same meaningful positions unless the section
around them was restructured.
Keep at least 3 syntax-highlighted code blocks and the comparison table in the revised article. If
a code example is buggy or wouldn't run, FIX it in place — do not delete it. Removing a code block
to save space is the same failure as shortening the article and is not acceptable.
NEVER invent a statistic to make a claim sound more concrete — only use a number that's grounded
in the article's own experience notes or example. If you find a fabricated-sounding percentage,
either remove it or replace it with the qualitative mechanism it was standing in for.
