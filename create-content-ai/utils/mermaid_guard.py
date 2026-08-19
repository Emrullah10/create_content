"""Mermaid sozdiziminin en temel seviyede gecerli olup olmadigini kontrol eder.
Tam bir parser degil — puppeteer render'a gondermeden once bariz bozuklugu (bos govde,
taninmayan diyagram tipi) erken yakalamak icin bir on-filtre.
"""

VALID_PREFIXES = (
    "flowchart", "graph", "sequenceDiagram", "classDiagram",
    "stateDiagram", "erDiagram", "gantt", "pie", "journey",
)


def is_valid_mermaid(source: str) -> bool:
    stripped = source.strip()
    if not stripped:
        return False
    first_line = stripped.splitlines()[0].strip()
    return any(first_line.startswith(p) for p in VALID_PREFIXES)
