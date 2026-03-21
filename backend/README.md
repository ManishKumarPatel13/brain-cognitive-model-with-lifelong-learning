# Brain Monitor Backend

FastAPI backend for the Brain Monitor dashboard with **Episodic Memory System** using Pinecone vector database. The system learns from past conversations and injects relevant context into new queries.

## Features

- **Gemini 3 Flash API** - Fast LLM inference
- **Pinecone Vector Database** - Persistent episodic memory
- **Sentence Transformers** - Free local embeddings
- **Memory Cycle** - Automatic context retrieval and storage

## Setup

### 1. Get API Keys

#### Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your key (free tier available)

#### Pinecone (Vector Database)
1. Sign up at [Pinecone.io](https://www.pinecone.io/) (free tier)
2. Create a new project
3. Copy your **API Key** and **Environment** (e.g., `gcp-starter`)

### 2. Create Python Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env and paste your Gemini API key and Pinecone credentials
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- **fastapi** - Web framework
- **google-generativeai** - Gemini API
- **pinecone-client** - Vector database
- **sentence-transformers** - Local embeddings (no API needed)
- **python-dotenv** - Environment variables

### 5. Run the Server

```bash
python main.py
```

The API will be available at **http://localhost:8000**  
API docs (Swagger UI): **http://localhost:8000/docs**

## How the Memory System Works

### 🧠 The Memory Cycle

```
User Message
    ↓
[1] Convert to embedding (384D vector)
    ↓
[2] Search Pinecone for top 3 similar past conversations
    ↓
[3] Inject retrieved context into system prompt
    ↓
[4] Send enhanced prompt to Gemini
    ↓
[5] Save Q&A pair back to Pinecone as new memory
    ↓
Response to User
```

### Example

**First Query:**
```
User: "How do I optimize working memory?"
→ No past interactions found
→ Gemini generates response
→ New interaction saved to Pinecone
```

**Second Query (similar topic):**
```
User: "Tips for better memory management?"
→🔍 Pinecone retrieves previous answer about working memory
→ Gemini sees: "Based on past conversation: How do I optimize working memory? A: [previous answer]. Now answer: Tips for better memory management?"
→ Response incorporates continuity
```

## API Endpoints

### POST /api/chat
Sends a message to the chat system with memory injection.

**Request:**
```json
{
  "text": "Your question here"
}
```

**Response:**
```json
{
  "response": "Answer from Gemini (with memory context)",
  "status": "success",
  "prompt_sent": "Your question here",
  "system_prompt": "System instruction given to model",
  "context": "Previous relevant conversations (if found)",
  "memory_search_results": 2,
  "past_interactions": [
    {
      "question": "Similar past question",
      "answer": "Previous answer",
      "timestamp": "2024-03-21T10:30:00"
    }
  ]
}
```

### GET /api/memory/status
Check memory system status.

**Response:**
```json
{
  "status": "ok",
  "index": "brain-monitor-memory",
  "vector_count": 42,
  "dimensions": 384,
  "embedding_model": "all-MiniLM-L6-v2"
}
```

### GET /
Health check.

**Response:**
```json
{
  "status": "ok",
  "message": "Brain Monitor API with Memory System running"
}
```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes | `AIzaSy...` |
| `PINECONE_API_KEY` | Pinecone vector DB key | Yes | `pcsk_...` |
| `PINECONE_ENVIRONMENT` | Pinecone environment | Yes | `gcp-starter` |

## Architecture

```
Frontend (React)
    ↓
FastAPI Backend
    ├→ Embedding Service (sentence-transformers)
    ├→ Pinecone Client (vector search)
    └→ Gemini API (LLM inference)
```

## Technology Stack

- **fastapi** - Modern Python web framework
- **uvicorn** - ASGI server
- **google-generativeai** - Gemini LLM API
- **pinecone-client** - Vector database client
- **sentence-transformers** - Embeddings (open source, no API key needed)
- **python-dotenv** - Environment configuration

## CORS

The backend allows requests from all origins for development. Update the `CORSMiddleware` in `main.py` for production deployments.

## Troubleshooting

### "PINECONE_API_KEY not set"
Make sure `.env` file exists and contains your Pinecone credentials.

### "Cannot find sentence-transformers model"
The model downloads on first run (~138MB). Make sure you have internet and disk space.

### Memory not growing
Check `/api/memory/status` endpoint to see if interactions are being stored.

## Future Enhancements

- [ ] Memory aging and cleanup
- [ ] Conversation threading
- [ ] User-specific memory isolation
- [ ] Export/import conversations
- [ ] Advanced filtering (by date, topic, etc.)


