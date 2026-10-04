from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from services.nvidia_service import nvidia_service
from typing import Dict, Any, List, Optional

app = FastAPI(title="Create-Content AI Service (NVIDIA NIM)")



def _status_for(e: Exception) -> int:
    """NVIDIA/timeout hatalarinin gercek status kodunu (429/503) FastAPI'nin duz 500'e
    sarmasi yerine Node tarafina dogru iletir — retry mantigi bu koda gore karar verir.
    Timeout da 503 sayilir: paylasilan/ucretsiz kapasiteli bir modelde zaman asimi,
    pratikte "su an asiri yuklu" ile ayni anlama gelir ve retry edilmeye deger."""
    msg = str(e)
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
        return 429
    if "503" in msg or "UNAVAILABLE" in msg or "timed out" in msg.lower() or "timeout" in msg.lower():
        return 503
    return 500


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "message": "Create-Content NVIDIA NIM AI Service is ready."}


@app.post("/api/v1/ai/generate-topics")
async def generate_topics(
    theme: Dict[str, Any] = Body(...),
    existing_titles: List[str] = Body(default_factory=list),
    count: int = Body(20),
):
    try:
        topics = await nvidia_service.generate_topics(theme, existing_titles, count)
        return {"topics": topics}
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))


@app.post("/api/v1/ai/outline")
async def outline(topic: Dict[str, Any] = Body(...), expertise_notes: Optional[str] = Body(None)):
    try:
        return await nvidia_service.generate_outline(topic, expertise_notes)
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))


@app.post("/api/v1/ai/draft")
async def draft(topic: Dict[str, Any] = Body(...), outline: Dict[str, Any] = Body(...), expertise_notes: Optional[str] = Body(None)):
    # Onceden gecersiz mermaid tespit edilince TUM makale yeniden draft ediliyordu (pahali)
    # ve ikinci sonuc hic dogrulanmiyordu (etkisiz). Artik diyagram bazinda onarim Node
    # tarafinda render-diagrams asamasinda gercek mermaid parser'i ile yapiliyor (bkz
    # /repair-diagram) — burada sadece taslak uretilir, on-filtre kaldirildi.
    try:
        return await nvidia_service.draft_article(topic, outline, expertise_notes)
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))


@app.post("/api/v1/ai/critique")
async def critique(article: Dict[str, Any] = Body(..., embed=True)):
    try:
        return await nvidia_service.critique_and_revise(article)
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))


@app.post("/api/v1/ai/expand")
async def expand(article: Dict[str, Any] = Body(...), current_word_count: int = Body(...), expertise_notes: Optional[str] = Body(None)):
    try:
        return await nvidia_service.expand_article(article, current_word_count, expertise_notes)
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))


@app.post("/api/v1/ai/score")
async def score(article: Dict[str, Any] = Body(..., embed=True)):
    try:
        return await nvidia_service.score_article(article)
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))


@app.post("/api/v1/ai/repair-diagram")
async def repair_diagram(
    mermaid: str = Body(...),
    error: str = Body(...),
    diagram_type: str = Body(...),
):
    try:
        return await nvidia_service.repair_diagram(mermaid, error, diagram_type)
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))


@app.post("/api/v1/ai/targeted-revise")
async def targeted_revise(
    article: Dict[str, Any] = Body(...),
    quality_report: Dict[str, Any] = Body(...),
    threshold: int = Body(75),
):
    try:
        return await nvidia_service.targeted_revise(article, quality_report, threshold)
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))


@app.post("/api/v1/ai/cover")
async def cover(prompt: str = Body(..., embed=True)):
    try:
        image_bytes = await nvidia_service.generate_cover_image(prompt)
        return Response(content=image_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=_status_for(e), detail=str(e))
