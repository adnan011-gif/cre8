from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, validator


class Persona(BaseModel):
    creator_name: Optional[str] = None
    tone: str
    style: str
    pacing: Optional[str] = None
    humor: Optional[str] = None
    catchphrases: List[str] = Field(default_factory=list)
    audience: Optional[str] = None
    signature_patterns: List[str] = Field(default_factory=list)
    # Extra fields that may come from the YouTube persona extractor
    topics_of_interest: List[str] = Field(default_factory=list)
    quirks: List[str] = Field(default_factory=list)
    video_format_preferences: Optional[Dict[str, str]] = None
    characters: Optional[List[Dict[str, Any]]] = None

    class Config:
        extra = "allow"  # Accept any additional persona fields safely


class PersonaExtractRequest(BaseModel):
    creator_content: str


class Critique(BaseModel):
    score: float = Field(ge=0, le=10)
    issues: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    partial_rewrite: str


class GenerateRequest(BaseModel):
    topic: str
    persona: Persona
    platform: Optional[str] = "youtube"
    words_min: int = 500
    words_max: int = 700
    max_iters: int = 3
    pass_score: float = 8.0


class GenerateResponse(BaseModel):
    final_script: str
    critic_history: List[Critique]


# --------------- MODELS ----------------
class ContentRequest(BaseModel):
    platform: str
    prompt: str
    personify: Optional[bool] = False
    iterations: Optional[int] = 3

    # Optional persona passed from the frontend (user's saved persona from MongoDB).
    # Accepted as a free-form dict so any persona shape works; limited to 50 keys
    # to prevent abuse.
    persona: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional user persona dict forwarded from the frontend."
    )

    @validator("persona", pre=True, always=True)
    def limit_persona_size(cls, v):
        """Reject unreasonably large persona payloads (> 50 top-level keys)."""
        if v is not None and isinstance(v, dict) and len(v) > 50:
            raise ValueError("persona object exceeds the maximum allowed size of 50 keys.")
        return v

    class Config:
        schema_extra = {
            "example": {
                "platform": "youtube",
                "prompt": "How to make the perfect cup of coffee at home",
                "personify": True,
                "iterations": 3,
                "persona": {
                    "tone": "friendly and engaging",
                    "style": "educational",
                    "catchphrases": ["Let's dive in!", "That's crazy!"],
                },
            }
        }


class SaveOutputRequest(BaseModel):
    title: str
    type: str
    description: Optional[str] = None
    content: str
    platform: str