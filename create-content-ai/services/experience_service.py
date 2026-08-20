"""Ozgunluk kaynagi: AI'in genel bilgisi disinda, bu projede gercekten yasanmis
spesifik teknik bulgulari (dev.to API tuzaklari, NVIDIA/Gemini kisitlari, event
loop bloklama gibi) prompt'lara enjekte eder.

Neden gerekli: kalite skoru analizinde (2026-08-19) skorun uzunlukla degil AI'in
"generic tutorial" yazmasiyla sinirli oldugu goruldu — rubrigin %55'i (technical
depth + originality) genel egitim bilgisinden yazinca dogal olarak dusuk kaliyor.
.wolf/cerebrum.md ve memory.md bu projede gercekten cozulmus, baska hicbir yerde
yazmayan bulgularla dolu; bunlari konuya gore filtreleyip enjekte etmek AI'a
yazacak somut, birinci-agizdan bir sey verir.

Hata toleransli: dosyalar yoksa/okunamazsa sessizce bos string doner, pipeline
bu yuzden asla patlamaz.
"""
import os
import re
from pathlib import Path

WOLF_DIR = Path(os.environ.get("WOLF_DIR") or (Path(__file__).parent.parent.parent / ".wolf"))
MAX_CONTEXT_CHARS = 1500


def _read_file_safe(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return ""


def _split_into_blocks(text: str) -> list[str]:
    # Her madde-isareti satiri kendi basina bir blok olur (tek bir bulgu = tek blok),
    # boylece alaka puanlamasi bulgu bazinda calisir, tum listeyi tek parca gormez.
    blocks = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            blocks.append(stripped[2:].strip())
        elif stripped and not stripped.startswith("#") and not stripped.startswith("|"):
            blocks.append(stripped)
    return [b for b in blocks if len(b) > 20]


def _score_block(block: str, keywords: list[str]) -> int:
    lower = block.lower()
    return sum(1 for kw in keywords if kw and re.search(re.escape(kw.lower()), lower))


def get_relevant_experience(title: str, keywords: list[str]) -> str:
    """Baslik+keywords ile anahtar kelime ortusmesine gore ilgili bulgulari dondurur.
    Eslesme yoksa bos string — cagiran taraf bu durumda prompt'taki ilgili blogu atlar."""
    all_keywords = [*(keywords or []), *title.split()]
    if not all_keywords:
        return ""

    cerebrum = _read_file_safe(WOLF_DIR / "cerebrum.md")
    memory = _read_file_safe(WOLF_DIR / "memory.md")
    if not cerebrum and not memory:
        return ""

    blocks = _split_into_blocks(cerebrum) + _split_into_blocks(memory)
    scored = [(b, _score_block(b, all_keywords)) for b in blocks]
    relevant = sorted((b for b, score in scored if score > 0), key=lambda b: -_score_block(b, all_keywords))

    if not relevant:
        return ""

    out, total = [], 0
    for block in relevant:
        if len(block) > MAX_CONTEXT_CHARS:
            continue  # tek basina cok buyuk bir blok (orn. memory.md tablosu) — atla, digerlerini dene
        if total + len(block) > MAX_CONTEXT_CHARS:
            continue
        out.append(block)
        total += len(block)

    if not out:
        return ""
    return "\n".join(f"- {block}" for block in out)
