from services.chain import get_chain, get_res
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from functools import lru_cache
import json
import re
import logging

# Setup logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Pydantic models for request/response
class TranscriptItem(BaseModel):
    videoId: str
    transcript: str

class TranscriptRequest(BaseModel):
    transcripts: List[TranscriptItem]

class PersonaResponse(BaseModel):
    persona: dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache the chain (FAISS + model) - removed caching for dynamic transcripts
def get_chain_cached():
    return get_chain()

def extract_json(response: str):
    try:
        json_str = re.search(r'\{.*\}', response, re.DOTALL).group()
        return json.loads(json_str)
    except Exception as e:
        logger.error(f"Error extracting JSON: {e}")
        return {"error": "Invalid JSON"}

def process_transcripts_to_context(transcripts: List[TranscriptItem]) -> str:
    """Convert transcripts to a context string for persona analysis"""
    context_parts = []
    
    for i, item in enumerate(transcripts, 1):
        context_parts.append(f"""
VIDEO {i} (ID: {item.videoId}):
TRANSCRIPT:
{item.transcript}
---""")
    
    return "\n".join(context_parts)

def extract_transcript_texts(transcripts: List[TranscriptItem]) -> List[str]:
    """Extract just the transcript text from the request items"""
    return [item.transcript for item in transcripts]

@app.post('/persona', response_model=PersonaResponse)
async def persona_extraction(request: TranscriptRequest):
    try:
        logger.info(f"🚀 Starting persona extraction for {len(request.transcripts)} transcripts...")
        
        # Process transcripts into context
        context = process_transcripts_to_context(request.transcripts)
        logger.info("✅ Transcripts processed into context")
        
        # Extract transcript texts for the chain
        transcript_texts = extract_transcript_texts(request.transcripts)
        
        # Get the chain with the provided transcripts
        chain = get_chain(transcripts=transcript_texts)
        
        # Create a custom prompt that includes the transcripts
        custom_prompt = f"""
Extract my persona profile and tone from my past content below.

CONTENT TO ANALYZE:
{context}

Please analyze this content and extract my persona profile.
"""
        
        res = get_res(chain, custom_prompt)
        logger.info("✅ Persona extraction complete.")
        
        # Extract the JSON response
        persona_data = extract_json(res)
        
        return PersonaResponse(persona=persona_data)
        
    except Exception as e:
        logger.error(f"❌ Error in /persona: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/health')
async def health_check():
    return {"status": "healthy", "message": "Persona extraction service is running"}

