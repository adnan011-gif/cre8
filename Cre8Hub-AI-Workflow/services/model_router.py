"""
model_router.py
Cascading LLM provider: Gemini 2.5 Flash → Groq free tier → local Ollama.
On a quota/429 error the router transparently falls through to the next provider.

Includes per-creator circuit breaker so that one over-quota creator does not
affect other creators' jobs.
"""
import time
import logging
from typing import Tuple, Optional

from config.llm_config import (
    GEMINI_API_KEY, GEMINI_MODEL,
    GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL,
    OLLAMA_BASE_URL, OLLAMA_MODEL,
    gemini_available, groq_available, ollama_available,
    is_quota_error,
)

logger = logging.getLogger(__name__)

# ── Circuit-breaker defaults ──────────────────────────────────────────────────
_MAX_CALLS_PER_CREATOR = 50       # max LLM calls per window per creator
_CIRCUIT_WINDOW_SECONDS = 3600    # 1 hour sliding window
_CIRCUIT_BACKOFF_SECONDS = 300    # how long a tripped creator stays blocked


class ModelRouter:
    """
    Thread-safe singleton that returns an LLM instance from the first
    available provider, falling back automatically on quota/429 errors.

    Provider priority:
        1. Gemini 2.5 Flash  (requires GOOGLE_API_KEY)
        2. Groq free tier    (requires GROQ_API_KEY)
        3. Local Ollama      (no key required — must be running locally)

    Circuit breaker tracks per-creator call frequency.  If a single creator
    exceeds MAX_CALLS_PER_CREATOR within CIRCUIT_WINDOW_SECONDS, their calls
    are blocked (CircuitBreakerError) while all other creators continue normally.
    """

    _instance: Optional["ModelRouter"] = None

    # Per-creator rate tracking: {creator_id: [timestamp, ...]}
    _call_log: dict = {}
    # Per-creator block expiry: {creator_id: expiry_timestamp}
    _blocked_until: dict = {}

    def __new__(cls) -> "ModelRouter":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    # ── Circuit breaker helpers ───────────────────────────────────────────────

    def _prune_call_log(self, creator_id: str):
        """Remove timestamps outside the sliding window."""
        now = time.time()
        cutoff = now - _CIRCUIT_WINDOW_SECONDS
        if creator_id in self._call_log:
            self._call_log[creator_id] = [
                ts for ts in self._call_log[creator_id] if ts > cutoff
            ]

    def _is_circuit_open(self, creator_id: str) -> bool:
        """Check whether this creator is currently blocked."""
        now = time.time()
        if creator_id in self._blocked_until:
            if now < self._blocked_until[creator_id]:
                return True
            # Block expired — clear it
            del self._blocked_until[creator_id]
        return False

    def _record_call(self, creator_id: str):
        """Log a call from this creator."""
        now = time.time()
        if creator_id not in self._call_log:
            self._call_log[creator_id] = []
        self._call_log[creator_id].append(now)
        # Prune old entries
        self._prune_call_log(creator_id)
        # Check threshold and trip circuit if needed
        if len(self._call_log[creator_id]) >= _MAX_CALLS_PER_CREATOR:
            self._blocked_until[creator_id] = now + _CIRCUIT_BACKOFF_SECONDS
            logger.warning(
                f"[CircuitBreaker] Creator '{creator_id}' exceeded {_MAX_CALLS_PER_CREATOR} "
                f"calls in {_CIRCUIT_WINDOW_SECONDS}s — blocked for {_CIRCUIT_BACKOFF_SECONDS}s"
            )

    def check_circuit(self, creator_id: Optional[str] = None) -> Optional[str]:
        """
        Check whether a creator is allowed to make an LLM call.
        Returns None if allowed, or a human-readable error message if blocked.
        """
        if not creator_id:
            return None
        self._prune_call_log(creator_id)
        if self._is_circuit_open(creator_id):
            retry_after = int(self._blocked_until[creator_id] - time.time())
            return (
                f"Circuit breaker open for creator '{creator_id}'. "
                f"Retry in ~{retry_after}s. No other creators are affected."
            )
        return None

    # ── Public API ────────────────────────────────────────────────────────────

    def get_llm(
        self,
        task_type: str = "general",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        streaming: bool = False,
        creator_id: Optional[str] = None,
    ):
        """Return the first working LLM instance."""
        circuit_msg = self.check_circuit(creator_id)
        if circuit_msg:
            raise CircuitBreakerError(circuit_msg)
        llm, provider = self.get_llm_with_fallback(
            task_type, temperature, max_tokens, streaming,
        )
        self._record_call(creator_id) if creator_id else None
        return llm

    def get_llm_with_fallback(
        self,
        task_type: str = "general",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        streaming: bool = False,
        creator_id: Optional[str] = None,
    ) -> Tuple[object, str]:
        """
        Return (llm_instance, provider_name).
        Tries providers in order; skips any that are unavailable or raise on init.
        """
        circuit_msg = self.check_circuit(creator_id)
        if circuit_msg:
            raise CircuitBreakerError(circuit_msg)

        providers = [
            ("gemini",  self._try_gemini),
            ("groq",    self._try_groq),
            ("ollama",  self._try_ollama),
        ]

        last_error = None
        for name, factory in providers:
            try:
                llm = factory(temperature, max_tokens, streaming)
                if llm is not None:
                    logger.info(f"[ModelRouter] Using provider: {name}")
                    self._record_call(creator_id) if creator_id else None
                    return llm, name
            except Exception as e:
                last_error = e
                logger.warning(f"[ModelRouter] Provider '{name}' failed: {e}. Trying next.")

        raise RuntimeError(
            f"All LLM providers exhausted. Last error: {last_error}"
        )

    # ── Provider factories ────────────────────────────────────────────────────

    def _try_gemini(self, temperature: float, max_tokens: int, streaming: bool):
        if not gemini_available():
            return None
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                api_key=GEMINI_API_KEY,
                temperature=temperature,
                max_output_tokens=max_tokens,
                streaming=streaming,
            )
        except ImportError:
            logger.warning("[ModelRouter] langchain_google_genai not installed.")
            return None

    def _try_groq(self, temperature: float, max_tokens: int, streaming: bool):
        if not groq_available():
            return None
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=GROQ_MODEL,
                openai_api_key=GROQ_API_KEY,
                openai_api_base=GROQ_BASE_URL,
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=streaming,
            )
        except ImportError:
            logger.warning("[ModelRouter] langchain_openai not installed.")
            return None

    def _try_ollama(self, temperature: float, max_tokens: int, streaming: bool):
        if not ollama_available():
            return None
        try:
            from langchain_community.chat_models import ChatOllama
            return ChatOllama(
                model=OLLAMA_MODEL,
                base_url=OLLAMA_BASE_URL,
                temperature=temperature,
            )
        except ImportError:
            try:
                from langchain_community.llms import Ollama
                return Ollama(
                    model=OLLAMA_MODEL,
                    base_url=OLLAMA_BASE_URL,
                    temperature=temperature,
                )
            except ImportError:
                logger.warning("[ModelRouter] No Ollama langchain package found.")
                return None


class CircuitBreakerError(Exception):
    """Raised when a specific creator's circuit breaker is open."""
    pass


# ── Module-level singleton ────────────────────────────────────────────────────
router = ModelRouter()
