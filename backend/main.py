from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import google.generativeai as genai
import logging

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


@app.post("/api/chat")
async def chat(message: ChatMessage):
    """Forward the message to Gemini API and return the response."""
    try:
        print(f"\n📨 Received message: {message.text}")
        
        # Create model
        model = genai.GenerativeModel(model_name="gemini-3-flash-preview")
        
        # Combine system prompt with user message
        full_message = f"{SYSTEM_PROMPT}\n\nUser: {message.text}"
        
        # Call Gemini API with the user message
        print(f"🔄 Sending to Gemini API with system prompt...")
        response = model.generate_content(full_message)
        
        print(f"✓ Received response from Gemini")
        print(f"Response text: {response.text[:100]}...")
        
        return {
            "response": response.text,
            "status": "success",
            "prompt_sent": message.text,
            "system_prompt": SYSTEM_PROMPT
        }
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error: {error_msg}")
        logger.exception("Error calling Gemini API")
        return {
            "response": f"Error: {error_msg}",
            "status": "error",
            "prompt_sent": message.text,
            "error": error_msg
        }


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Brain Monitor API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
