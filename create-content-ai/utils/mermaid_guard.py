"""Mermaid sozdiziminin en temel seviyede gecerli olup olmadigini kontrol eder.
Tam bir parser degil — puppeteer render'a gondermeden once bariz bozuklugu (bos govde,
taninmayan diyagram tipi) erken yakalamak icin bir on-filtre.
"""

import re

VALID_PREFIXES = (
    "flowchart", "graph", "sequenceDiagram", "classDiagram",
    "stateDiagram", "erDiagram", "gantt", "pie", "journey",
)

# "-->|Label|>" gecersiz (fazladan ">"), dogrusu "-->|Label|" — model bunu siklikla
# karistiriyor ve mermaid bunu parse hatasiyla (kirmizi bomba SVG'si) sonuclandiriyor.
INVALID_EDGE_LABEL = re.compile(r"\|>")

# erDiagram iliski etiketi (son ":"den sonraki metin) mermaid spec'ine gore SADECE cift tirnakla
# opsiyonel olabiliyor — tek tirnak ('uses' gibi, tek kelime olsa bile) VEYA tirnaksiz birden fazla
# kelime VEYA tum-buyuk-harf bir SQL/mermaid anahtar kelimesiyle (EXISTS, JOIN, SELECT...) ayni
# olursa parser patliyor (ikisi de dogrulandi: puppeteer "error diagram" SVG'si donduruyor).
# Gecerli: `A ||--o{ B : "uses subquery to filter data"`, `A ||--o{ B : owns` (tirnaksiz tek kelime).
# Gecersiz: `A ||--o{ B : 'uses'`, `A ||--o{ B : uses subquery ...`, `A ||--o{ B : EXISTS`.
ER_RELATIONSHIP_LINE = re.compile(r"^\s*\S+\s+[|o}{.]+[-.]{2}[|o}{.]+\s+\S+\s*:\s*(.+)$", re.MULTILINE)
SQL_KEYWORDS = {"EXISTS", "JOIN", "SELECT", "WHERE", "FROM", "INSERT", "UPDATE", "DELETE"}


def _has_invalid_er_relationship_label(source: str) -> bool:
    for match in ER_RELATIONSHIP_LINE.finditer(source):
        label = match.group(1).strip()
        if not label:
            continue
        if label.startswith("'") or label.endswith("'"):
            return True
        if label.startswith('"') and label.endswith('"'):
            continue
        if label.upper() in SQL_KEYWORDS:
            return True
        if " " in label:
            return True
    return False


def is_valid_mermaid(source: str) -> bool:
    stripped = source.strip()
    if not stripped:
        return False
    first_line = stripped.splitlines()[0].strip()
    if not any(first_line.startswith(p) for p in VALID_PREFIXES):
        return False
    if INVALID_EDGE_LABEL.search(stripped):
        return False
    if first_line.startswith("erDiagram") and _has_invalid_er_relationship_label(stripped):
        return False
    return True
