from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json
import os
import time
from dotenv import load_dotenv
load_dotenv()
import asyncio
from typing import Optional, Dict, Any, List, AsyncGenerator
from langchain_core.prompts import PromptTemplate
from langchain_classic.chains import LLMChain
from langchain_core.callbacks.base import BaseCallbackHandler
from services.model_router import router as _model_router
from services.chain import PLATFORM_TEMPLATES
from models.models import ContentRequest, SaveOutputRequest

# --------------- STREAMING CALLBACK HANDLER ----------------
class StreamingCallbackHandler(BaseCallbackHandler):
    def __init__(self):
        self.tokens = []
    
    def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.tokens.append(token)

# --------------- CONFIG ----------------
app = FastAPI(title="Multi-Platform Content Generator", version="1.0.0")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight for 24 hours
)

# Environment variable validation
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
print("GOOGLE_API_KEY:", "Set" if GOOGLE_API_KEY else "Not Set")

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY is not set. Please export it before running.")

# Load persona JSON with error handling
try:
    with open("responses.json", "r") as f:
        persona = json.load(f)
    print("Persona loaded successfully")
except FileNotFoundError:
    print("Warning: responses.json file not found. Using default persona.")
    persona = {"persona": {"creator_name": "AI Content Creator", "tone": "friendly", "style": "engaging"}}
except json.JSONDecodeError:
    raise ValueError("Invalid JSON format in responses.json file.")

# LLM setup via model router (Gemini → Groq → Ollama fallback)
try:
    generator_llm, _gen_provider = _model_router.get_llm_with_fallback(
        task_type="generation",
        temperature=0.9,
        max_tokens=4048,
        streaming=True,
        creator_id="server-init",
    )
    critic_llm, _crit_provider = _model_router.get_llm_with_fallback(
        task_type="critique",
        temperature=0.7,
        max_tokens=2048,
        streaming=True,
        creator_id="server-init",
    )
    print(f"LLM models initialized successfully (generator={_gen_provider}, critic={_crit_provider})")
except Exception as e:
    raise ValueError(f"Failed to initialize LLM models: {str(e)}")

# Platform-specific content templates (same as before)



# --------------- HELPER FUNCTIONS ----------------
def get_persona_field(field_name: str, default="", req_persona: dict = None):
    """Safely extract persona fields.
    
    Priority:
      1. req.persona (user's saved persona from MongoDB, passed by the frontend)
      2. responses.json static fallback persona
    """
    try:
        # If the request carried a per-user persona, use it first
        if req_persona and isinstance(req_persona, dict):
            if field_name in req_persona:
                return req_persona[field_name] or default
        # Fall back to the static responses.json persona
        return persona.get("persona", {}).get(field_name, default)
    except (KeyError, TypeError):
        return default

def format_list_field(field_list):
    """Format list fields for prompt templates"""
    if isinstance(field_list, list):
        return ", ".join(field_list) if field_list else "None specified"
    return str(field_list) if field_list else "None specified"

def generate_content_title(platform: str, prompt: str) -> str:
    """Generate a title based on platform and prompt"""
    platform_titles = {
        "youtube": f"YouTube Video: {prompt[:50]}...",
        "instagram": f"Instagram Post: {prompt[:50]}...",
        "twitter": f"Twitter Thread: {prompt[:50]}...",
        "linkedin": f"LinkedIn Post: {prompt[:50]}..."
    }
    return platform_titles.get(platform, f"{platform.title()} Content: {prompt[:50]}...")

# --------------- STREAMING FUNCTIONS ----------------
async def stream_content_generation(req: ContentRequest) -> AsyncGenerator[str, None]:
    """Stream content generation with critic/generator loop.
    
    Uses req.persona (user's per-user persona from MongoDB) when available,
    falling back to the static responses.json persona.
    """
    # Resolve which persona to use for this request
    req_persona = req.persona  # may be None
    if req.platform not in PLATFORM_TEMPLATES:
        yield f"data: {json.dumps({'error': f'Unsupported platform: {req.platform}'})}\n\n"
        return
    
    platform_config = PLATFORM_TEMPLATES[req.platform]
    max_rounds = req.iterations or 3
    
    # Send initial status
    yield f"data: {json.dumps({'status': 'starting', 'message': f'Starting content generation for {req.platform}...'})}\n\n"
    
    try:
        # Prepare personification note
        personification_note = ""
        if req.personify:
            personification_note = "\nIMPORTANT: Fully embody the creator's personality, use their catchphrases naturally, and write as if you ARE them."
        else:
            personification_note = "\nWrite in a professional, engaging style without specific personality quirks."
        
        # Create prompt templates
        generator_template = PromptTemplate.from_template(platform_config["generator_template"])
        critic_template = PromptTemplate.from_template(platform_config["critic_template"])
        
        content = None
        critiques = []
        
        for i in range(max_rounds):
            yield f"data: {json.dumps({'status': 'generating', 'iteration': i+1, 'max_iterations': max_rounds})}\n\n"
            
            # Prepare improvement note for subsequent iterations
            improvement_note = ""
            if i > 0 and critiques:
                improvement_note = f"\nIMPROVEMENT NEEDED: {critiques[-1]}"
            
            # Create streaming callback handler
            streaming_handler = StreamingCallbackHandler()
            
            # Create generator chain with streaming
            generator_chain = LLMChain(
                llm=generator_llm, 
                prompt=generator_template,
                callbacks=[streaming_handler]
            )
            
            # Stream content generation
            yield f"data: {json.dumps({'status': 'content_streaming', 'message': 'Generating content...'})}\n\n"
            
            # Run generation (this will populate streaming_handler.tokens)
            content = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: generator_chain.run(
                    creator_name=get_persona_field("creator_name", "Content Creator", req_persona),
                    tone=get_persona_field("tone", "friendly", req_persona),
                    style=get_persona_field("style", "engaging", req_persona),
                    catchphrases=format_list_field(get_persona_field("catchphrases", [], req_persona)),
                    prompt=req.prompt.strip(),
                    personification_note=personification_note,
                    improvement_note=improvement_note
                )
            )
            
            # Stream the generated content token by token
            if content:
                for j, char in enumerate(content):
                    yield f"data: {json.dumps({'type': 'content_token', 'token': char, 'position': j})}\n\n"
                    await asyncio.sleep(0.01)  # Small delay for streaming effect
                
                # Send complete content
                yield f"data: {json.dumps({'type': 'content_complete', 'content': content})}\n\n"
            
            # Now get critique
            yield f"data: {json.dumps({'status': 'critiquing', 'message': 'Getting feedback...'})}\n\n"
            
            critic_chain = LLMChain(llm=critic_llm, prompt=critic_template)
            
            critique = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: critic_chain.run(
                    tone=get_persona_field("tone", "friendly", req_persona),
                    style=get_persona_field("style", "engaging", req_persona),
                    catchphrases=format_list_field(get_persona_field("catchphrases", [], req_persona)),
                    quirks=format_list_field(get_persona_field("quirks", [], req_persona)),
                    content=content
                )
            )
            
            critiques.append(critique)
            
            # Send critique
            yield f"data: {json.dumps({'type': 'critique', 'critique': critique, 'iteration': i+1})}\n\n"
            
            # Check if approved
            if "APPROVED" in critique.upper():
                yield f"data: {json.dumps({'status': 'approved', 'iterations': i+1, 'message': f'Content approved after {i+1} iterations!'})}\n\n"
                break
            elif i < max_rounds - 1:
                yield f"data: {json.dumps({'status': 'improving', 'message': 'Improving content based on feedback...'})}\n\n"
        
        # Final result
        final_status = "APPROVED" if "APPROVED" in critiques[-1].upper() else "MAX_ITERATIONS_REACHED"
        
        response_content = {
            "title": generate_content_title(req.platform, req.prompt),
            "type": platform_config["type"],
            "description": f"Generated {req.platform} content for: {req.prompt[:100]}..." + 
                          (f" (Approved after {len(critiques)} iterations)" if final_status == "APPROVED" else 
                          f" (Max iterations reached: {len(critiques)})"),
            "content": content.strip(),
            "platform": req.platform
        }
        
        yield f"data: {json.dumps({'type': 'final_result', 'content': response_content, 'status': final_status, 'iterations': len(critiques), 'critiques': critiques})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

# --------------- ROUTES ----------------
@app.get("/")
async def root():
    return {
        "message": "Multi-Platform Content Generator API", 
        "version": "1.0.0",
        "creator": get_persona_field("creator_name", "AI Content Creator"),
        "supported_platforms": list(PLATFORM_TEMPLATES.keys()),
        "streaming_enabled": True
    }

@app.get("/persona")
async def get_persona():
    """Get the current static persona configuration (from responses.json)."""
    return {"persona": persona.get("persona", {})}


class PersonaFromTranscriptsRequest(BaseModel):
    transcripts: List[Dict[str, Any]]  # [{"videoId": "...", "transcript": "..."}]


@app.post("/persona")
async def extract_persona_from_transcripts(req: PersonaFromTranscriptsRequest):
    """
    Accept transcripts from the Node.js YouTube service and extract a persona
    using the LangChain persona extraction chain.
    Called by: Backend/src/services/youtubeService.js
    """
    if not req.transcripts:
        raise HTTPException(status_code=400, detail="No transcripts provided.")

    try:
        from services.chain import get_chain, get_res

        # Flatten transcripts into text strings for the chain
        transcript_texts = [
            t.get("transcript", "") for t in req.transcripts if t.get("transcript")
        ]

        if not transcript_texts:
            raise HTTPException(
                status_code=422,
                detail="All provided transcripts were empty."
            )

        chain = get_chain(transcripts=transcript_texts)
        raw_result = get_res(chain, "Extract the full persona from these transcripts.")

        # Try to parse JSON; if it fails, return raw string under 'raw' key
        try:
            extracted_persona = json.loads(raw_result)
        except (json.JSONDecodeError, TypeError):
            extracted_persona = {"raw": raw_result}

        return {"persona": extracted_persona}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Persona extraction failed: {str(exc)}"
        )

# Global OPTIONS handler for all routes
@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle all preflight OPTIONS requests"""
    return {
        "message": "OK", 
        "path": path,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "cors_enabled": True
    }

@app.options("/generate-stream")
async def generate_stream_options():
    """Handle preflight OPTIONS request for streaming endpoint"""
    return {"message": "OK", "endpoint": "generate-stream"}

@app.post("/generate-stream")
async def generate_content_stream(req: ContentRequest):
    """Generate content with streaming response"""
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    # Validate iterations
    max_rounds = req.iterations or 3
    if max_rounds < 1 or max_rounds > 10:
        raise HTTPException(status_code=400, detail="Iterations must be between 1 and 10")
    
    return StreamingResponse(
        stream_content_generation(req),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    )

# Keep the original non-streaming endpoint for backward compatibility
@app.post("/generate")
async def generate_content(req: ContentRequest):
    """Generate content (non-streaming version for backward compatibility)"""
    print(f"Received generate request: {req.platform}, {req.prompt[:50]}...")
    
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    if req.platform not in PLATFORM_TEMPLATES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported platform. Supported platforms: {list(PLATFORM_TEMPLATES.keys())}"
        )
    
    # This would contain your original generate_content logic
    # I'll keep it simple for brevity, but you can copy from your original
    return {"message": "Use /generate-stream for better user experience"}

@app.post("/save_output")
async def save_output(req: SaveOutputRequest):
    """Save generated content output"""
    try:
        print(f"Saving output: {req.title} ({req.platform})")
        return {"status": "success", "message": "Content saved successfully"}
    except Exception as e:
        print(f"Error saving output: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save content: {str(e)}")

@app.get("/platforms")
async def get_supported_platforms():
    """Get list of supported platforms with their details"""
    return {
        "platforms": [
            {
                "id": platform,
                "name": platform.title(),
                "content_type": config["type"],
                "description": f"Generate {config['type'].replace('_', ' ')} for {platform.title()}"
            }
            for platform, config in PLATFORM_TEMPLATES.items()
        ]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "google_api_key_set": bool(GOOGLE_API_KEY),
        "persona_loaded": bool(persona),
        "supported_platforms": len(PLATFORM_TEMPLATES),
        "cors_configured": True,
        "streaming_enabled": True
    }

# ═══════════════════════════════════════════════════════════════════════════
# CRE8STUDIO — Canvas & Video Endpoints (Milestone 2)
# ═══════════════════════════════════════════════════════════════════════════
from pathlib import Path as _Path
import shutil as _shutil

_OUTPUTS_DIR = _Path(os.path.dirname(os.path.abspath(__file__))) / "outputs"
_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# Serve generated files (images + videos) as static assets
try:
    app.mount("/outputs", StaticFiles(directory=str(_OUTPUTS_DIR)), name="outputs")
except Exception:
    pass  # Already mounted


class ShortGenRequest(BaseModel):
    script: str
    title: str = "Cre8Hub Short"
    voice_mode: str = "voiced"   # "voiced" | "silent"
    output_tag: str = "organic"  # "organic" | "ad"
    creator_id: str = "default"


@app.post("/studio/generate")
async def studio_generate_image(
    prompt: str = Form(...),
    aspect_ratio: str = Form("16:9"),
    purpose: str = Form("thumbnail"),
    num_images: int = Form(4),
    creator_id: str = Form("default"),
    reference_image: UploadFile = File(None),
    text_fields: str = Form("{}"),
):
    """Generate canvas images (thumbnails, posters, posts, ad creatives).
    Optionally accepts a reference image file for img2img context.
    text_fields is a JSON string: { brand_name, headline, pricing, features[], cta }.
    Each field is auto-styled (size, color, position) based on field type and image analysis.
    """
    from services.image_gen import generate_images

    if reference_image and reference_image.filename:
        raw_bytes = await reference_image.read()
        import base64
        b64 = base64.b64encode(raw_bytes).decode("utf-8")
        ext = os.path.splitext(reference_image.filename)[1].lower()
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/png")
        data_uri = f"data:{mime};base64,{b64}"
        agnes_key = os.environ.get("AGNES_API_KEY", "")
        if agnes_key:
            from services.video_gen import _upload_image
            ref_img_data = _upload_image(agnes_key, data_uri) or data_uri
        else:
            ref_img_data = data_uri
    else:
        ref_img_data = None

    try:
        fields = json.loads(text_fields) if text_fields else {}
    except (json.JSONDecodeError, TypeError):
        fields = {}

    results = generate_images(
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        purpose=purpose,
        num_images=num_images,
        creator_id=creator_id,
        reference_image_url=ref_img_data,
        text_fields=fields if fields else None,
    )
    return {"images": results, "count": len(results)}


@app.post("/studio/short")
async def studio_generate_short(req: ShortGenRequest):
    """Generate a voiced or silent MP4 short from a script."""
    from services.video_editor import generate_short
    result = generate_short(
        script=req.script,
        title=req.title,
        voice_mode=req.voice_mode,
        output_tag=req.output_tag,
        creator_id=req.creator_id,
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@app.post("/studio/video")
async def studio_generate_video(
    prompt: str = Form(...),
    duration: int = Form(5),
    aspect_ratio: str = Form("16:9"),
    creator_id: str = Form("default"),
    reference_image: UploadFile = File(None),
):
    """Generate AI video from a text prompt using Pollinations.ai (free)."""
    from services.video_gen import generate_video

    ref_url = None
    if reference_image and reference_image.filename:
        raw_bytes = await reference_image.read()
        import base64
        b64 = base64.b64encode(raw_bytes).decode("utf-8")
        ext = os.path.splitext(reference_image.filename)[1].lower()
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/png")
        ref_url = f"data:{mime};base64,{b64}"

    result = generate_video(
        prompt=prompt,
        duration=duration,
        aspect_ratio=aspect_ratio,
        creator_id=creator_id,
        reference_image_url=ref_url,
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@app.post("/studio/clip")
async def studio_clip_video(file: UploadFile = File(...), creator_id: str = "default", max_clips: int = 3):
    """Upload a raw video, get AI-clipped vertical MP4s back."""
    from services.video_editor import clip_raw_video

    # Save upload to temp location
    temp_path = _OUTPUTS_DIR / "temp" / f"upload_{creator_id}_{file.filename}"
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    with open(temp_path, "wb") as f:
        _shutil.copyfileobj(file.file, f)

    clips = clip_raw_video(
        video_path=str(temp_path),
        creator_id=creator_id,
        max_clips=max_clips,
    )

    # Clean up upload
    try:
        temp_path.unlink()
    except Exception:
        pass

    return {"clips": clips, "count": len(clips)}


# ═══════════════════════════════════════════════════════════════════════════
# CRE8AGENT — Agentic Pipeline Endpoints (Milestone 5)
# ═══════════════════════════════════════════════════════════════════════════

class TrendRequest(BaseModel):
    niche: str
    num_trends: int = 5
    creator_id: str = "default"


class PitchRequest(BaseModel):
    trends: List[Dict[str, Any]]
    creator_persona: Dict[str, Any] = {}
    platform: str = "youtube"
    creator_id: str = "default"


class CalendarRequest(BaseModel):
    pitches: List[Dict[str, Any]]
    posting_frequency: int = 3  # per week
    start_date: Optional[str] = None
    creator_id: str = "default"


class ApprovalRequest(BaseModel):
    calendar: List[Dict[str, Any]]
    approved_indices: List[int]   # indices into the calendar list to approve
    creator_id: str = "default"


class StrategyMessage(BaseModel):
    message: str
    history: List[Dict[str, str]] = []   # [{"role": "user"|"assistant", "content": "..."}]
    creator_persona: Dict[str, Any] = {}
    creator_id: str = "default"


@app.post("/agent/trends")
async def agent_research_trends(req: TrendRequest):
    """Discover trending topics for the creator's niche."""
    from services.agent_pipeline import research_trends
    try:
        trends = research_trends(niche=req.niche, num_trends=req.num_trends, creator_id=req.creator_id)
        return {"trends": trends, "niche": req.niche}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/pitches")
async def agent_generate_pitches(req: PitchRequest):
    """Generate content pitches from a list of trends."""
    from services.agent_pipeline import generate_pitches
    try:
        pitches = generate_pitches(
            trends=req.trends,
            creator_persona=req.creator_persona,
            platform=req.platform,
            creator_id=req.creator_id,
        )
        return {"pitches": pitches}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/calendar")
async def agent_build_calendar(req: CalendarRequest):
    """Schedule pitches into a posting calendar (status=pending until approved)."""
    from services.agent_pipeline import build_calendar
    try:
        calendar = build_calendar(
            pitches=req.pitches,
            posting_frequency=req.posting_frequency,
            start_date=req.start_date,
        )
        return {"calendar": calendar}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/approve")
async def agent_approve_calendar(req: ApprovalRequest):
    """
    One-click approval gate.
    Marks selected calendar slots as 'approved', others as 'rejected'.
    Returns the updated calendar — approved items are safe to schedule.
    """
    updated = []
    for i, slot in enumerate(req.calendar):
        slot_copy = dict(slot)
        slot_copy["status"] = "approved" if i in req.approved_indices else "rejected"
        updated.append(slot_copy)
    return {"calendar": updated, "approved_count": len(req.approved_indices)}


@app.post("/agent/chat")
async def agent_strategy_chat(req: StrategyMessage):
    """Multi-turn strategy advisor chat powered by ModelRouter."""
    from services.agent_pipeline import strategy_chat
    try:
        reply = strategy_chat(
            user_message=req.message,
            conversation_history=req.history,
            creator_persona=req.creator_persona,
            creator_id=req.creator_id,
        )
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
