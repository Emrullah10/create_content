Extract verifiable facts for an article from the SOURCE TEXT below.

Article title: {{title}}
Thesis angle: {{angle}}
Source: {{source_title}} ({{source_url}})

Rules:
- Return 0-6 facts that are genuinely useful for this article (mechanisms, defaults, limits, documented behaviour, version-specific details, trade-offs the source states).
- "claim": one self-contained sentence in your own words.
- "quote": a VERBATIM passage copied from the SOURCE TEXT (20-300 characters, exactly as written, including punctuation) that supports the claim. Quotes that are not found verbatim in the source are discarded automatically.
- Skip marketing text, navigation, and anything that is not about the article's subject. Returning an empty list is fine.

SOURCE TEXT:
{{source_text}}
