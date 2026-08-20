"""NVIDIA NIM (build.nvidia.com) client — Gemini'nin yerini alir (metin).
OpenAI SDK ile uyumlu bir uc nokta (https://integrate.api.nvidia.com/v1) kullanir.

Gorsel uretimi NVIDIA'dan DEGIL: build.nvidia.com'daki Stable Diffusion 3.5 Large
hosted/bulut API olarak sunulmuyor — sadece kendi GPU'nda Docker ile self-host
edilebiliyor (dogrulandi: model sayfasindaki tek entegrasyon yolu `docker run` +
localhost invoke_url, anahtarla cagrilabilen bir cloud endpoint yok). Bu yuzden
kapak gorseli icin anahtar gerektirmeyen Pollinations.ai kullanilir.

Neden Gemini'den vazgecildi: free tier'da hem metin (gunluk 20 istek) hem gorsel
(0 kota, faturalandirma sart) modelleri otomasyon icin yetersizdi.
"""
import os
import json
from pathlib import Path
from urllib.parse import quote
from openai import AsyncOpenAI
import httpx
from dotenv import load_dotenv

load_dotenv()

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
IMAGE_ENDPOINT_DEFAULT = "https://image.pollinations.ai/prompt"


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def _fill(template: str, **kwargs) -> str:
    out = template
    for key, value in kwargs.items():
        placeholder = "{{" + key + "}}"
        out = out.replace(placeholder, str(value))
    return out


def _build_experience_context(title: str, keywords: list, expertise_notes: str | None) -> str:
    # Otomatik (.wolf/ konuya-gore filtreli) + manuel (kullanicinin tema notlari) birlestirilir.
    # Ikisi de opsiyonel — hicbiri yoksa bos doner, prompt'taki blok tamamen sessizce dusmus olur.
    from services.experience_service import get_relevant_experience

    auto = get_relevant_experience(title or "", keywords or [])
    manual = (expertise_notes or "").strip()

    parts = []
    if manual:
        parts.append(f"Your own noted expertise on this topic (use this as a primary source of specific, first-person claims):\n{manual}")
    if auto:
        parts.append(f"Specific findings from this project's own engineering history (use these as concrete evidence where relevant, not as filler):\n{auto}")

    if not parts:
        return ""
    return "\n\nRELEVANT EXPERIENCE CONTEXT:\n" + "\n\n".join(parts)


class NvidiaService:
    def __init__(self):
        api_key = os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            raise RuntimeError("NVIDIA_API_KEY is not set")

        # Aciklama: openai SDK varsayilan timeout'u cok uzun olabiliyor (600s'ye kadar) —
        # bu, Node tarafindaki withRetry'nin devreye girmesini geciktirip tum pipeline'i
        # tek bir yavas/askida-kalan cagriya kilitleyebiliyordu (dogrulandi: gercek bir
        # calistirmada 14+ dakika hicbir ilerleme olmadan takili kaldi). 90s'lik acik bir
        # timeout, Node'un 4-denemeli retry'sinin makul surede devreye girmesini saglar.
        # timeout 150s'ye cikarildi: draft.md artik 1200-1800 kelime hedefliyor,
        # daha uzun uretim daha uzun surer — 90s bu hedef icin cok kisa kalabiliyordu.
        self.client = AsyncOpenAI(base_url=NVIDIA_BASE_URL, api_key=api_key, timeout=150.0, max_retries=0)
        self.text_model = os.environ.get("NVIDIA_TEXT_MODEL") or "meta/llama-3.3-70b-instruct"
        self.image_endpoint = os.environ.get("IMAGE_ENDPOINT") or IMAGE_ENDPOINT_DEFAULT
        self._api_key = api_key

    async def _generate_json(self, prompt: str, response_model, temperature: float = 0.7):
        # nvext.guided_json meta/llama-3.3-70b-instruct'ta sessizce yok sayiliyor (test edildi:
        # serbest metin donuyor, JSON degil). Onun yerine standart OpenAI response_format
        # json_object kullanilir + semayi prompt'a govde icinde acikca yaziyoruz (json_object
        # modu "JSON uret" der ama hangi alanlari istedigini modele soylemez).
        schema = response_model.model_json_schema()
        json_prompt = (
            f"{prompt}\n\n"
            f"Respond with ONLY a single JSON object (no markdown, no commentary) matching exactly "
            f"this JSON schema:\n{json.dumps(schema)}"
        )
        completion = await self.client.chat.completions.create(
            model=self.text_model,
            messages=[{"role": "user", "content": json_prompt}],
            temperature=temperature,
            max_tokens=8000,
            response_format={"type": "json_object"},
        )
        return json.loads(completion.choices[0].message.content)

    async def generate_topics(self, theme: dict, existing_titles: list, count: int):
        from utils.schema import TopicList
        prompt = _fill(
            _load_prompt("topic_generation.md"),
            count=count,
            theme_name=theme.get("name", ""),
            theme_description=theme.get("description", ""),
            target_audience=theme.get("targetAudience", ""),
            theme_tags=", ".join(theme.get("tags", [])),
            existing_titles="\n".join(f"- {t}" for t in existing_titles) or "(none yet)",
        )
        result = await self._generate_json(prompt, TopicList)
        return result["topics"]

    async def generate_outline(self, topic: dict, expertise_notes: str | None = None):
        from utils.schema import Outline
        keywords = topic.get("keywords", [])
        prompt = _fill(
            _load_prompt("outline.md"),
            title=topic.get("title", ""),
            angle=topic.get("angle", ""),
            keywords=", ".join(keywords),
            experience_context=_build_experience_context(topic.get("title", ""), keywords, expertise_notes),
        )
        return await self._generate_json(prompt, Outline)

    async def draft_article(self, topic: dict, outline: dict, expertise_notes: str | None = None):
        from utils.schema import ArticleDraft
        keywords = topic.get("keywords", [])
        prompt = _fill(
            _load_prompt("draft.md"),
            title=topic.get("title", ""),
            outline=json.dumps(outline),
            experience_context=_build_experience_context(topic.get("title", ""), keywords, expertise_notes),
        )
        return await self._generate_json(prompt, ArticleDraft)

    async def critique_and_revise(self, article: dict):
        from utils.schema import CritiqueResult
        prompt = _fill(_load_prompt("critique.md"), article=json.dumps(article))
        return await self._generate_json(prompt, CritiqueResult)

    async def expand_article(self, article: dict, current_word_count: int, expertise_notes: str | None = None):
        # meta/llama-3.3-70b-instruct (NVIDIA free tier'da erisilebilen tek buyuk model)
        # draft/critique asamalarinda 1200-1800 kelime hedefine rutin olarak ulasamiyor
        # (dogrulandi: 3 farkli prompt stratejisi denendi, hepsi 380-900 kelime bandinda
        # kaldi). Bu yuzden ayri, dar kapsamli bir "sadece genislet" turu eklendi.
        from utils.schema import ExpandResult
        prompt = _fill(
            _load_prompt("expand.md"),
            article=json.dumps(article),
            current_word_count=current_word_count,
            experience_context=_build_experience_context(article.get("title", ""), article.get("tags", []), expertise_notes),
        )
        return await self._generate_json(prompt, ExpandResult)

    async def score_article(self, article: dict):
        # Model artik toplam skor uretmiyor (score-first bug'i: sema/prompt'ta score ilk
        # sirada olunca model rakami analiz yazilmadan once taahhut ediyordu, sonuc: 10
        # makalenin 9'u tipatip 72 aliyordu — alt skorlar cok farkliyken bile). Toplam artik
        # kodda, kriter basina 0-5'ten agirlikli olarak hesaplaniyor. temperature=0.01: judge
        # cagrisi icin dusuk sicaklik daha tutarli sonuc verir (arastirma: T=0 degil, T~0.01).
        from utils.schema import QualityReport
        prompt = _fill(_load_prompt("quality_rubric.md"), article=json.dumps(article))
        result = await self._generate_json(prompt, QualityReport, temperature=0.01)

        weighted = (
            result["technical_depth"] * 0.35
            + result["structural_richness"] * 0.25
            + result["clarity"] * 0.20
            + result["originality"] * 0.20
        )
        score = round(weighted / 5 * 100)
        return {"score": score, "report": result}

    async def generate_cover_image(self, prompt_text: str) -> bytes:
        # NVIDIA'nin build.nvidia.com katalogunda Stable Diffusion 3.5 Large hosted/bulut API
        # olarak sunulmuyor — sadece kendi GPU'nda Docker ile self-host edilebiliyor (dogrulandi:
        # model sayfasindaki tek "API" yolu `docker run ... -p 8000:8000` + localhost invoke_url).
        # Onun yerine anahtar gerektirmeyen, gercekten ucretsiz Pollinations.ai kullanilir.
        # cover_prompt'u once kirp, SONRA template'i doldur — aksi halde template'in sonundaki
        # "Style: ... no embedded text" cumlesi 800 karakter siniri yuzunden kesilebiliyordu.
        prompt = _fill(_load_prompt("cover_image.md"), cover_prompt=prompt_text[:500])
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            response = await client.get(
                f"{self.image_endpoint}/{quote(prompt)}",
                params={"width": 1200, "height": 630, "nologo": "true", "model": "flux", "enhance": "true"},
            )
            response.raise_for_status()
            return response.content


class _LazyNvidiaService:
    """NVIDIA_API_KEY olmadan da modul import edilebilsin diye (health check calissin) lazy init."""

    def __init__(self):
        self._instance = None

    def _get(self):
        if self._instance is None:
            self._instance = NvidiaService()
        return self._instance

    def __getattr__(self, name):
        return getattr(self._get(), name)


nvidia_service = _LazyNvidiaService()
