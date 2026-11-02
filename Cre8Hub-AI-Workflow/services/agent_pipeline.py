"""
agent_pipeline.py
Cre8Agent — Autonomous creator agent pipeline.

Flow:  Trend Research → Pitch Generation → Content Calendar → One-Click Approval Gate
Every step uses the ModelRouter so it automatically falls back Gemini → Groq → Ollama.
A circuit breaker is enforced before any scheduled/autonomous action ships.
"""
import os
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from services.model_router import router as _model_router

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# 1. TREND RESEARCH
# ─────────────────────────────────────────────────────────────────────────────

def research_trends(niche: str, num_trends: int = 5, creator_id: Optional[str] = None) -> List[dict]:
    """
    Discover the top trending topics for a creator's niche using pytrends
    or Gemini's own knowledge as a fallback.
    Returns list of { keyword, score, reason }.
    """
    try:
        return _pytrends_research(niche, num_trends)
    except Exception as e:
        logger.warning(f"[TrendResearch] pytrends failed ({e}) — falling back to LLM research")
        return _llm_trend_research(niche, num_trends, creator_id=creator_id)


def _pytrends_research(niche: str, num_trends: int) -> List[dict]:
    from pytrends.request import TrendReq
    pt = TrendReq(hl="en-US", tz=360)
    pt.build_payload([niche], cat=0, timeframe="now 7-d", geo="")
    related = pt.related_queries()
    top_df = related.get(niche, {}).get("top")
    if top_df is None or top_df.empty:
        raise ValueError("pytrends returned empty data")

    results = []
    for _, row in top_df.head(num_trends).iterrows():
        results.append({
            "keyword": str(row["query"]),
            "score": int(row["value"]),
            "reason": f"Trending in '{niche}' with search interest score {row['value']}/100",
        })
    return results


def _llm_trend_research(niche: str, num_trends: int, creator_id: Optional[str] = None) -> List[dict]:
    llm = _model_router.get_llm(task_type="trend_research", temperature=0.6, max_tokens=1024, creator_id=creator_id)
    prompt = f"""
You are a social media trend analyst. List the top {num_trends} trending content topics 
for a creator in the '{niche}' niche RIGHT NOW in 2025-2026.
Respond ONLY with valid JSON (no markdown), this exact structure:
[
  {{"keyword": "...", "score": 85, "reason": "..."}},
  ...
]
"""
    result = llm.invoke(prompt)
    raw = result.content if hasattr(result, "content") else str(result)
    raw = raw.strip().strip("` \n").lstrip("json").strip()
    return json.loads(raw)


# ─────────────────────────────────────────────────────────────────────────────
# 2. PITCH GENERATION
# ─────────────────────────────────────────────────────────────────────────────

def generate_pitches(
    trends: List[dict],
    creator_persona: dict,
    platform: str = "youtube",
    creator_id: Optional[str] = None,
) -> List[dict]:
    """
    For each trend generate a content pitch: title, hook, format, estimated reach.
    Returns list of pitch dicts.
    """
    llm = _model_router.get_llm(task_type="pitch_gen", temperature=0.85, max_tokens=2048, creator_id=creator_id)

    niche = creator_persona.get("niche", "general")
    tone = creator_persona.get("tone", "engaging")
    trends_json = json.dumps(trends, indent=2)

    prompt = f"""
You are a content strategist. Based on these trends for a {niche} creator on {platform}:

{trends_json}

Creator tone/style: {tone}

Generate one content pitch per trend. Each pitch MUST include:
- title: an engaging video/post title
- hook: an opening line that stops scrollers
- format: e.g. "YouTube tutorial", "Instagram Reel", "TikTok trend"
- cta: call-to-action for the audience
- estimated_reach: "Low" | "Medium" | "High"

Respond ONLY with valid JSON array (no markdown):
[
  {{"trend_keyword": "...", "title": "...", "hook": "...", "format": "...", "cta": "...", "estimated_reach": "High"}},
  ...
]
"""
    result = llm.invoke(prompt)
    raw = result.content if hasattr(result, "content") else str(result)
    raw = raw.strip().strip("` \n").lstrip("json").strip()
    pitches = json.loads(raw)
    return pitches


# ─────────────────────────────────────────────────────────────────────────────
# 3. CONTENT CALENDAR
# ─────────────────────────────────────────────────────────────────────────────

def build_calendar(
    pitches: List[dict],
    posting_frequency: int = 3,  # posts per week
    start_date: Optional[str] = None,  # ISO date string
) -> List[dict]:
    """
    Schedule pitches into a content calendar.
    Returns list of { date, day, pitch, status="pending" }.
    """
    start = datetime.fromisoformat(start_date) if start_date else datetime.utcnow()
    # Distribute posts across the week
    interval_days = max(1, 7 // posting_frequency)

    calendar = []
    for i, pitch in enumerate(pitches):
        post_date = start + timedelta(days=i * interval_days)
        calendar.append({
            "date": post_date.strftime("%Y-%m-%d"),
            "day": post_date.strftime("%A"),
            "pitch": pitch,
            "status": "pending",  # approval gate: pending | approved | rejected
        })
    return calendar


# ─────────────────────────────────────────────────────────────────────────────
# 4. STRATEGY CHAT
# ─────────────────────────────────────────────────────────────────────────────

def strategy_chat(
    user_message: str,
    conversation_history: List[dict],
    creator_persona: dict,
    creator_id: Optional[str] = None,
) -> str:
    """
    Interactive strategy assistant.
    Uses rolling conversation history for contextual multi-turn advice.
    """
    llm = _model_router.get_llm(task_type="strategy_chat", temperature=0.75, max_tokens=1024, creator_id=creator_id)

    niche = creator_persona.get("niche", "general content creation")
    tone = creator_persona.get("tone", "helpful and direct")

    system_prompt = f"""You are a strategic AI content advisor for a creator in the {niche} niche.
Your tone is {tone}. Help with content strategy, platform growth, monetization, and scheduling.
Be concise, data-driven, and actionable. Keep answers under 200 words unless detail is explicitly requested."""

    # Build message list for the LLM
    messages = [{"role": "system", "content": system_prompt}]
    for turn in conversation_history[-10:]:  # Rolling 10-turn context window
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})

    # Use invoke with message list if the LLM supports it (ChatModel)
    try:
        from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
        lc_messages = [SystemMessage(content=system_prompt)]
        for turn in conversation_history[-10:]:
            if turn["role"] == "user":
                lc_messages.append(HumanMessage(content=turn["content"]))
            else:
                lc_messages.append(AIMessage(content=turn["content"]))
        lc_messages.append(HumanMessage(content=user_message))

        result = llm.invoke(lc_messages)
        return result.content if hasattr(result, "content") else str(result)
    except Exception:
        # Simple string fallback
        result = llm.invoke(f"{system_prompt}\n\nUser: {user_message}")
        return result.content if hasattr(result, "content") else str(result)
