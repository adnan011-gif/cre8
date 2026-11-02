"""
llm.py
Backward-compatible get_llm() now backed by the ModelRouter.
Any existing call to get_llm() continues to work unchanged.
"""
import os
from services.model_router import router


def get_llm(
    model_name: str = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
    streaming: bool = False,
):
    """
    Return an LLM instance.

    If model_name is provided it is treated as a hint for Gemini (the primary
    provider will use it if it supports custom model names); other providers
    ignore it and use their configured defaults.

    Falls back automatically: Gemini → Groq → Ollama.
    """
    # Temporarily override the Gemini model if a specific name was requested
    if model_name:
        import config.llm_config as cfg
        _original = cfg.GEMINI_MODEL
        cfg.GEMINI_MODEL = model_name
        try:
            return router.get_llm(temperature=temperature, max_tokens=max_tokens, streaming=streaming)
        finally:
            cfg.GEMINI_MODEL = _original
    return router.get_llm(temperature=temperature, max_tokens=max_tokens, streaming=streaming)