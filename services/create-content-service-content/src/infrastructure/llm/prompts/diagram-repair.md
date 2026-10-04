A Mermaid diagram failed to parse. You are given the exact parser error; use it.

Diagram type: {{diagram_type}}

Broken source:
```
{{mermaid}}
```

Parser error:
```
{{error}}
```

Fix ONLY the syntax problem. Do not redesign the diagram. Common causes:
- erDiagram relationship labels: one unquoted word or a double-quoted string after the last `:`; never single quotes, never an unquoted multi-word phrase, never an SQL keyword (EXISTS, JOIN, SELECT).
- erDiagram entities need attributes or a relationship.
- sequenceDiagram: `participant X as Label`; `Note over X: text`; never a bare `note 'text'`.
- Edge labels are `-->|Label|`, never `-->|Label|>`.
- stateDiagram-v2: double quotes only.
- Node ids must not contain spaces.
Return the full corrected source in the `mermaid` field, ready to render.
