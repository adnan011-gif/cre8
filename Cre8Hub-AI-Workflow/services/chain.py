import logger
import os
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.prompts import PromptTemplate
from services.ingest import get_vb
from services.llm import get_llm
from langchain_classic.chains import RetrievalQA
from langchain_classic.chains import LLMChain
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
import logging
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import List, Optional

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def get_chain(transcripts: Optional[List[str]] = None):
    try:
        if transcripts:
            # Create dynamic chain with provided transcripts
            logger.info("Creating dynamic chain with provided transcripts")
            
            # Convert transcripts to documents
            docs = []
            for i, transcript in enumerate(transcripts):
                doc = Document(
                    page_content=f"TRANSCRIPT {i+1}:\n{transcript}",
                    metadata={"source": f"transcript_{i+1}"}
                )
                docs.append(doc)
            
            # Create embeddings and vector store
            embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2",
                model_kwargs={"device": "cpu"}
            )
            
            # Create FAISS index from documents
            vectorstore = FAISS.from_documents(docs, embeddings)
            retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": len(docs)})
            
        else:
            # Use existing FAISS index (fallback)
            logger.info("Using existing FAISS index")
            db = get_vb()
            retriever = db.as_retriever(search_type="similarity", search_kwargs={"k": 1000})

        logger.info("Retriever configured successfully.")

        persona_prompt = PromptTemplate(
            input_variables=["context"],
            template="""
        You are a content analyst AI trained to extract a content creator's persona from their YouTube scripts, transcripts, and speech patterns.

        Your task is to extract a structured persona from the content below.

        🛑 STRICT INSTRUCTIONS:
        - OUTPUT MUST BE VALID JSON ONLY — NO commentary, explanation, markdown, or code fencing.
        - Return JSON in the exact structure shown.

        ---

        📥 Content:
        {context}

        ---

        🧠 JSON OUTPUT FORMAT:
        {{
        "creator_name": "string",
        "tone": "string",
        "style": "string",
        "catchphrases": ["string", "string", ...],
        "topics_of_interest": ["string", "string", ...],
        "characters": [
            {{
            "name": "string",
            "role": "string",
            "speech_style": "string",
            "catchphrases": ["string", "string", ...]
            }},
            ...
        ],
        "video_format_preferences": {{
            "opening_style": "string",
            "mid_section": "string",
            "ending": "string"
        }},
        "quirks": ["string", "string", ...]
        }}

        🛑 IMPORTANT:
        Only output valid JSON. No extra text.
        """
        )

        logger.info("Getting LLM instance...")
        # Using ChatGoogleGenerativeAI via get_llm (replaces Ollama)
        llm = get_llm("gemini-2.5-flash")
        logger.info("LLM instance obtained successfully.")

        # Create the QA chain with proper input/output keys
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            chain_type_kwargs={
                "prompt": persona_prompt,
                "verbose": True  # Enable verbose mode for debugging
            },
            return_source_documents=True,  # Return source documents for transparency
            input_key="question",  # Explicitly set input key
            output_key="result"    # Explicitly set output key
        )
        logger.info("QA chain created successfully.")
        return qa_chain

    except Exception as e:
        logger.error(f"Error in get_chain(): {str(e)}")
        raise

def get_res(chain, query, transcripts: Optional[List[str]] = None):
    logger.info(f"retrieving Persona")
        
    # Get AI-generated rectification
    response = chain.invoke({"question": query})
     
    # Extract result
    if isinstance(response, dict):
        persona = response.get('result', response.get('answer', str(response)))
    else:
        persona = str(response)
        
    return persona
        



load_dotenv()



GENERATOR_PROMPT = """\
You are an AI scriptwriter that mimics creators’ styles.

TASK: Write a script about: "{topic}" for platform: {platform}

Persona Style:
- Tone: {tone}
- Style: {style}
- Pacing: {pacing}
- Humor: {humor}
- Audience: {audience}
- Catchphrases: {catchphrases}
- Signature Patterns: {signature_patterns}

Constraints:
- Target length: {words_min}-{words_max} words.
- Include at least one catchphrase naturally.
- Follow the pacing described (e.g., fast intro, relaxed middle, hype outro).

Output ONLY the script text (no JSON, no headings, no commentary).
"""

CRITIC_PROMPT = """\
You are a strict persona critic. Compare the script to the persona and output STRICT JSON ONLY.

PERSONA:
- Tone: {tone}
- Style: {style}
- Pacing: {pacing}
- Humor: {humor}
- Audience: {audience}
- Catchphrases: {catchphrases}
- Signature Patterns: {signature_patterns}

SCRIPT:
\"\"\"{script}\"\"\"

EVALUATE and return EXACTLY this JSON:
{{
  "score": 7.5,
  "issues": ["..."],
  "improvements": ["..."],
  "partial_rewrite": "..."
}}
"""

GEN_MODEL = os.getenv("GEN_MODEL", "gemini-1.5-flash")
CRITIC_MODEL = os.getenv("CRITIC_MODEL", "gemini-1.5-pro")

# LLMs — wrapped in try/except so importing chain.py doesn't crash
# if GOOGLE_API_KEY isn't set at import time (it's validated at startup in cre8echo.py)
try:
    generator_llm = ChatGoogleGenerativeAI(model=GEN_MODEL, temperature=0.7)
    critic_llm = ChatGoogleGenerativeAI(model=CRITIC_MODEL, temperature=0.2)
except Exception as _llm_init_err:
    logger.warning(f"⚠️  Could not initialise module-level LLMs at import time: {_llm_init_err}")
    generator_llm = None
    critic_llm = None

# Prompts
generator_tmpl = PromptTemplate.from_template(GENERATOR_PROMPT)
critic_tmpl = PromptTemplate.from_template(CRITIC_PROMPT)

# Chains — only built if LLMs are available
if generator_llm and critic_llm:
    generator_chain = LLMChain(llm=generator_llm, prompt=generator_tmpl, verbose=False)
    critic_chain = LLMChain(llm=critic_llm, prompt=critic_tmpl, verbose=False)
else:
    generator_chain = None
    critic_chain = None

__all__ = [
    "extract_chain",
    "generator_chain",
    "critic_chain",
    "GEN_MODEL",
    "CRITIC_MODEL",
]

PLATFORM_TEMPLATES = {
    "youtube": {
        "type": "video_script",
        "generator_template": """
You are creating YouTube content as {creator_name}.

PERSONA:
- Tone: {tone}
- Style: {style}
- Catchphrases: {catchphrases}

CREATE: A YouTube video script for: "{prompt}"

STRUCTURE:
1. Hook (0-15 seconds)
2. Introduction 
3. Main content (detailed)
4. Call-to-action
5. Outro

{personification_note}
{improvement_note}

Generate an engaging video script:""",
        "critic_template": """
You are evaluating YouTube content for authenticity and engagement.

PERSONA GUIDELINES:
- Tone: {tone}
- Style: {style}  
- Catchphrases: {catchphrases}
- Quirks: {quirks}

GENERATED SCRIPT:
{content}

EVALUATION CRITERIA:
1. Does the script authentically match the creator's persona?
2. Is the hook compelling (first 15 seconds)?
3. Is the content well-structured and engaging?
4. Are catchphrases used naturally?
5. Does it have a clear call-to-action?

RESPONSE FORMAT:
- If the script meets all criteria well, respond: "APPROVED"
- If improvements needed, provide specific, actionable feedback in 2-3 sentences

Your evaluation:"""
    },
    "instagram": {
        "type": "post_caption",
        "generator_template": """
You are creating Instagram content as {creator_name}.

PERSONA:
- Tone: {tone}
- Style: {style}
- Catchphrases: {catchphrases}

CREATE: An Instagram post caption for: "{prompt}"

REQUIREMENTS:
- Engaging hook in first line
- Visual storytelling focus
- Relevant hashtags (5-10)
- Call-to-action
- Stories/carousel suggestions if relevant

{personification_note}
{improvement_note}

Generate Instagram content:""",
        "critic_template": """
You are evaluating Instagram content for engagement and authenticity.

PERSONA GUIDELINES:
- Tone: {tone}
- Style: {style}
- Catchphrases: {catchphrases}
- Quirks: {quirks}

GENERATED CONTENT:
{content}

EVALUATION CRITERIA:
1. Does the content match the creator's persona authentically?
2. Is the first line compelling and hook-worthy?
3. Are hashtags relevant and not excessive?
4. Does it encourage visual storytelling?
5. Is there a clear call-to-action?

RESPONSE FORMAT:
- If the content meets all criteria well, respond: "APPROVED"
- If improvements needed, provide specific, actionable feedback in 2-3 sentences

Your evaluation:"""
    },
    "twitter": {
        "type": "tweet_thread",
        "generator_template": """
You are creating Twitter content as {creator_name}.

PERSONA:
- Tone: {tone}
- Style: {style}
- Catchphrases: {catchphrases}

CREATE: Twitter content for: "{prompt}"

REQUIREMENTS:
- Thread format (numbered tweets)
- Each tweet under 280 characters
- Engaging hook in first tweet
- Clear, concise messaging
- Relevant hashtags
- Call-to-action in final tweet

{personification_note}
{improvement_note}

Generate Twitter thread:""",
        "critic_template": """
You are evaluating Twitter content for engagement and character limits.

PERSONA GUIDELINES:
- Tone: {tone}
- Style: {style}
- Catchphrases: {catchphrases}
- Quirks: {quirks}

GENERATED CONTENT:
{content}

EVALUATION CRITERIA:
1. Does each tweet stay under 280 characters?
2. Is the first tweet a compelling hook?
3. Does the thread flow logically?
4. Does it match the creator's authentic voice?
5. Is there a clear call-to-action at the end?

RESPONSE FORMAT:
- If the content meets all criteria well, respond: "APPROVED"
- If improvements needed, provide specific, actionable feedback in 2-3 sentences

Your evaluation:"""
    },
    "linkedin": {
        "type": "professional_post",
        "generator_template": """
You are creating LinkedIn content as {creator_name}.

PERSONA:
- Tone: {tone} (but professional)
- Style: {style} (thought leadership focused)
- Catchphrases: {catchphrases}

CREATE: LinkedIn post for: "{prompt}"

REQUIREMENTS:
- Professional tone with personality
- Industry insights/thought leadership
- Engaging storytelling
- Clear value proposition
- Professional call-to-action
- Relevant professional hashtags

{personification_note}
{improvement_note}

Generate LinkedIn content:""",
        "critic_template": """
You are evaluating LinkedIn content for professionalism and thought leadership.

PERSONA GUIDELINES:
- Tone: {tone} (professional context)
- Style: {style}
- Catchphrases: {catchphrases}
- Quirks: {quirks}

GENERATED CONTENT:
{content}

EVALUATION CRITERIA:
1. Does it maintain professional tone while showing personality?
2. Does it provide genuine value/insights?
3. Is it appropriate for a professional audience?
4. Does it match the creator's authentic voice?
5. Is there a clear, professional call-to-action?

RESPONSE FORMAT:
- If the content meets all criteria well, respond: "APPROVED"
- If improvements needed, provide specific, actionable feedback in 2-3 sentences

Your evaluation:"""
    }
}
