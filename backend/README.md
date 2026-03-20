# Brain Monitor Backend

FastAPI backend for the Brain Monitor dashboard. Provides endpoints for AI interaction and data processing using Google's Gemini API.

## Setup

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Select or create a Google Cloud project
4. Copy your API key

### 2. Create a Python virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Set up environment variables

```bash
cp .env.example .env
# Edit .env and paste your Gemini API key
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Run the server

```bash
python main.py
```

The API will be available at **http://localhost:8000**

API documentation (Swagger UI): **http://localhost:8000/docs**

## Endpoints

### POST /api/chat

Sends a message to the Gemini API and returns the response along with prompt metadata.

**Request:**
```json
{
  "text": "Your message here"
}
```

**Response:**
```json
{
  "response": "AI response from Gemini",
  "status": "success",
  "prompt_sent": "Your message here",
  "system_prompt": "System instruction given to the model"
}
```

### GET /

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Brain Monitor API is running"
}
```

## CORS

The backend is configured to accept requests from all origins for development. In production, update the `CORSMiddleware` configuration in `main.py` to restrict origins.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

## Technology Stack

- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **Google Generative AI** - Gemini API client
- **Pydantic** - Data validation

