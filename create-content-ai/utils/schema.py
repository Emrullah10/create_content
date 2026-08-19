"""Pydantic response semalari — NVIDIA NIM guided_json structured output icin."""
from pydantic import BaseModel
from typing import List, Optional


class TopicSuggestion(BaseModel):
    title: str
    angle: str
    keywords: List[str]


class TopicList(BaseModel):
    topics: List[TopicSuggestion]


class Outline(BaseModel):
    sections: List[str]
    key_points: List[str]
    target_diagrams: List[str]


class Diagram(BaseModel):
    key: str
    type: str
    mermaid: str
    alt: str
    caption: str


class ArticleDraft(BaseModel):
    title: str
    subtitle: str
    summary: str
    tags: List[str]
    body_markdown: str
    diagrams: List[Diagram]
    cover_prompt: str


class CritiqueResult(BaseModel):
    notes: str
    body_markdown: str
    summary: str


class QualityReport(BaseModel):
    score: int
    reasoning: str
    strengths: List[str]
    weaknesses: List[str]
