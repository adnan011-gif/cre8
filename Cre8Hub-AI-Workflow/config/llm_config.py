"""
llm_config.py
Provider keys, model names, and per-provider quota thresholds for the model router.
"""
import os

# ── Gemini (Primary) ─────────────────────────────────────────────────────────
GEMINI_API_KEY   = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL     = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── Groq (Secondary — free tier) ─────────────────────────────────────────────
GROQ_API_KEY     = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL    = "https://api.groq.com/openai/v1"
GROQ_MODEL       = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

# ── Ollama (Tertiary — local fallback) ────────────────────────────────────────
OLLAMA_BASE_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL     = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

# ── Provider availability checks ─────────────────────────────────────────────
def gemini_available() -> bool:
    return bool(GEMINI_API_KEY)

def groq_available() -> bool:
    return bool(GROQ_API_KEY)

def ollama_available() -> bool:
    """Ollama is always considered available as a last resort if installed."""
    return True

# ── Error codes that trigger fallback ────────────────────────────────────────
QUOTA_ERROR_MESSAGES = [
    "429",
    "quota",
    "rate limit",
    "resource_exhausted",
    "RESOURCE_EXHAUSTED",
    "too many requests",
]

def is_quota_error(error: Exception) -> bool:
    """Return True if the error is a quota/rate-limit error that should trigger fallback."""
    msg = str(error).lower()
    return any(kw.lower() in msg for kw in QUOTA_ERROR_MESSAGES)
