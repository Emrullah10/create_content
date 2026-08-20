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


def is_valid_mermaid(source: str) -> bool:
    stripped = source.strip()
    if not stripped:
        return False
    first_line = stripped.splitlines()[0].strip()
    if not any(first_line.startswith(p) for p in VALID_PREFIXES):
        return False
    if INVALID_EDGE_LABEL.search(stripped):
        return False
    return True
