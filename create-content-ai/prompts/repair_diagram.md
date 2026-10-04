# Mermaid Diagram Repair

You wrote a Mermaid diagram that failed to parse. You are given the exact parser error — use
it, don't guess at what might be wrong.

Diagram type: {{diagram_type}}

Broken source:
```
{{mermaid}}
```

Parser error:
```
{{error}}
```

Fix ONLY the syntax problem the error points to. Do not redesign the diagram, do not change
what it depicts, do not add or remove nodes/entities unless the error requires it. Common
causes worth checking:
- erDiagram relationship labels: only a double-quoted string or a single unquoted word is
  valid after the trailing `:` — never single quotes, never an unquoted multi-word phrase,
  never an all-caps SQL keyword (EXISTS, JOIN, SELECT...) as the label.
- erDiagram entities need at least one attribute line or a relationship referencing them —
  a bare entity name with `{}` and nothing inside, or two entities joined with no attributes
  and no relationship label, is invalid.
- sequenceDiagram: `participant X as "Label"` and `Note over X: text` — never `note 'text'`
  as a standalone statement, never single-quoted aliases.
- Edge labels use `-->|Label|`, never `-->|Label|>` (no trailing `>`).
- stateDiagram-v2: quoted labels use double quotes, not single.

Output ONLY the corrected `mermaid` field — the full corrected diagram source, ready to
render as-is.
