from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import google.generativeai as genai
import logging
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
from datetime import datetime
import json

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set")

print(f"✓ Gemini API Key loaded successfully")
genai.configure(api_key=GEMINI_API_KEY)

# Configure Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")

if not PINECONE_API_KEY or not PINECONE_ENVIRONMENT:
    raise ValueError("PINECONE_API_KEY or PINECONE_ENVIRONMENT not set")

print(f"✓ Pinecone API Key loaded (first 10 chars): {PINECONE_API_KEY[:10]}...")
print(f"✓ Pinecone Environment: {PINECONE_ENVIRONMENT}")
print(f"✓ Connecting to Pinecone...")
try:
    pc = Pinecone(api_key=PINECONE_API_KEY)
except Exception as e:
    print(f"✗ Pinecone connection error: {e}")
    raise


# Get or create index
INDEX_NAME = "brain-monitor-memory"
try:
    index = pc.Index(INDEX_NAME)
    print(f"✓ Connected to Pinecone index: {INDEX_NAME}")
except Exception as e:
    print(f"⚠️  Creating new Pinecone index: {INDEX_NAME}")
    try:
        pc.create_index(
            name=INDEX_NAME,
            dimension=384,  # dimension of sentence-transformers/all-MiniLM-L6-v2
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")  # AWS Virginia
        )
        index = pc.Index(INDEX_NAME)
    except Exception as create_error:
        print(f"✗ Failed to create index: {create_error}")
        raise

# Load embedding model
print(f"✓ Loading embedding model...")
embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# System prompt for the AI
SYSTEM_PROMPT = """You are COGNITEX-AI, an intelligent assistant monitoring a cognitive architecture system. 
You help analyze working memory, semantic relationships, and episodic memory patterns. 
Provide concise, technical responses focused on system diagnostics and optimization."""

# Enable CORS to allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    text: str


def get_embedding(text: str):
    """Convert text to embedding vector."""
    return embedding_model.encode(text).tolist()


def search_memory(query_text: str, top_k: int = 3):
    """Search Pinecone for similar past conversations."""
    query_embedding = get_embedding(query_text)
    
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True
    )
    
    memories = []
    for match in results.get("matches", []):
        if match.get("metadata"):
            memories.append(match["metadata"])
    
    return memories


def save_interaction(question: str, answer: str):
    """Save Q&A interaction to Pinecone memory."""
    try:
        embedding = get_embedding(question)
        
        # Create unique ID based on timestamp
        interaction_id = f"interaction-{int(datetime.now().timestamp() * 1000)}"
        
        # Store metadata
        metadata = {
            "question": question,
            "answer": answer,
            "timestamp": datetime.now().isoformat(),
            "type": "interaction"
        }
        
        # Upsert to Pinecone
        index.upsert([(interaction_id, embedding, metadata)])
        print(f"✓ Saved interaction to Pinecone: {interaction_id}")
        
    except Exception as e:
        print(f"⚠️  Error saving to Pinecone: {str(e)}")


def build_context_prompt(user_question: str, past_interactions: list) -> tuple:
    """Build enhanced prompt with past context."""
    context_text = ""
    
    if past_interactions:
        context_text = "\n\n📚 Relevant past conversations:\n"
        for i, interaction in enumerate(past_interactions, 1):
            q = interaction.get("question", "")
            a = interaction.get("answer", "")[:200]  # Truncate long answers
            context_text += f"\n{i}. Q: {q}\n   A: {a}..."
    
    # Build full prompt
    full_prompt = f"""{SYSTEM_PROMPT}

{context_text}

Current Question: {user_question}

Answer the current question using the context above if relevant."""
    
    return full_prompt, context_text


@app.post("/api/chat")
async def chat(message: ChatMessage):
    """
    Memory Cycle:
    1. Search Pinecone for similar past conversations
    2. Inject relevant context into the prompt
    3. Send to Gemini
    4. Save the new interaction to Pinecone
    """
    try:
        print(f"\n📨 Received message: {message.text}")
        
        # Step 1: Search memory
        print(f"🔍 Searching Pinecone for similar conversations...")
        past_interactions = search_memory(message.text, top_k=3)
        print(f"✓ Found {len(past_interactions)} similar past interactions")
        
        # Step 2: Build enhanced prompt with context
        full_prompt, context_text = build_context_prompt(message.text, past_interactions)
        
        # Step 3: Send to Gemini
        print(f"🔄 Sending to Gemini API with memory context...")
        model = genai.GenerativeModel(model_name="gemini-3-flash-preview")
        response = model.generate_content(full_prompt)
        ai_response = response.text
        
        print(f"✓ Received response from Gemini")
        
        # Step 4: Save interaction to Pinecone for future reference
        save_interaction(message.text, ai_response)
        
        return {
            "response": ai_response,
            "status": "success",
            "prompt_sent": message.text,
            "system_prompt": SYSTEM_PROMPT,
            "context": context_text,
            "memory_search_results": len(past_interactions),
            "past_interactions": past_interactions
        }
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error: {error_msg}")
        logger.exception("Error in chat")
        return {
            "response": f"Error: {error_msg}",
            "status": "error",
            "prompt_sent": message.text,
            "error": error_msg
        }


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Brain Monitor API with Memory System running"}


@app.get("/api/memory/status")
async def memory_status():
    """Get memory system status."""
    try:
        stats = index.describe_index_stats()
        return {
            "status": "ok",
            "index": INDEX_NAME,
            "vector_count": stats.get("total_vector_count", 0),
            "dimensions": 384,
            "embedding_model": "all-MiniLM-L6-v2"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
