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
