# 🚀 Brain Monitor — Full Stack Cognitive Architecture

A real-time AI dashboard with persistent episodic memory, running Gemini 3 Flash + Pinecone vector database.

## 📊 Architecture

```
React Frontend (5173)
    ↓
FastAPI Backend (deployed on Render)
    ├→ Sentence Transformers (embeddings)
    ├→ Pinecone (vector memory)
    └→ Gemini 3 Flash (LLM)
```

## 🎯 Features

✅ **Chat with AI** - Real-time interaction with COGNITEX-AI  
✅ **Episodic Memory** - System learns from past conversations via Pinecone  
✅ **Smart Context** - Automatically injects relevant past context into new queries  
✅ **Live Monitoring** - Working Memory panel shows embeddings, memory searches, API calls  
✅ **Zero Hardware Load** - Backend runs on cloud, frontend is lightweight  

## 🏃 Quick Start

### Local Development (with deployed backend)

```bash
# Terminal 1: Backend already deployed to Render ✅
# (See DEPLOY.md for how to set it up)

# Terminal 2: Frontend
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:5173 and start chatting!

### Full Local Development (heavy hardware required)

```bash
# Terminal 1: Backend
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Terminal 2: Frontend
cd frontend
pnpm install
pnpm dev
```

## 📚 Documentation

- **[DEPLOY.md](./DEPLOY.md)** — Step-by-step Render deployment guide
- **[backend/README.md](./backend/README.md)** — API docs, environment setup
- **[frontend/Setup.md](./frontend/Setup.md)** — Frontend development

## 🧠 How Memory Works

### The Memory Cycle

1. **User sends message**
   ```
   "What is catastrophic forgetting?"
   ```

2. **System converts to embedding** (384-dimensional vector)
   ```
   [0.234, -0.001, 0.892, ...]
   ```

3. **Pinecone searches** for similar past conversations
   ```
   Found 3 relevant past Q&A pairs
   ```

4. **Context is injected** into the prompt
   ```
   "Here are relevant past conversations:
    - Q: What causes task interference?
      A: When learning Task A conflicts with Task B..."
   ```

5. **Gemini responds** with awareness of history
   ```
   "Catastrophic forgetting occurs when... [builds on past context]"
   ```

6. **New interaction saved** to Pinecone for tomorrow
   ```
   New Q&A stored as vector in database
   ```

### Example Evolution

**Day 1:**
- User: "What is working memory?"
- AI: Explains working memory
- System saves to Pinecone

**Day 2:**
- User: "How does working memory limit task performance?"
- AI: Finds Day 1 conversation, responds: "Based on our earlier discussion about working memory, task performance is limited because..."

## 🔑 API Keys Required

All **free tier**:

- **Gemini API** — [aistudio.google.com](https://aistudio.google.com/app/apikey)
- **Pinecone** — [pinecone.io](https://www.pinecone.io) (free tier supports up to 1M vectors)

## 📡 API Endpoints

### POST /api/chat
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text":"How do neural networks learn?"}'
```

Response includes:
- `response` — Answer from Gemini
- `context` — Retrieved past conversations
- `past_interactions` — Full Q&A history found
- `memory_search_results` — Number of similar interactions found

### GET /api/memory/status
```bash
curl http://localhost:8000/api/memory/status
```

Shows:
- Total vectors stored
- Memory index stats
- Embedding model used

## 🛠️ Tech Stack

**Frontend**
- React 18 + TypeScript
- Tailwind CSS v4
- Recharts (visualizations)
- Lucide Icons

**Backend**
- FastAPI + Uvicorn
- Google Generative AI (Gemini)
- Sentence Transformers (embeddings)
- Pinecone (vector database)

**Deployment**
- Render.com (free tier backend hosting)
- Vite dev server (frontend)

## 📋 Environment Variables

### Backend (.env)
```
GEMINI_API_KEY=your_key_here
PINECONE_API_KEY=your_key_here
PINECONE_ENVIRONMENT=gcp-starter
```

### Frontend (.env.local)
```
VITE_BACKEND_URL=https://your-render-app.render.com  # Only needed if deployed
```

## 🚀 Deployment

See **[DEPLOY.md](./DEPLOY.md)** for detailed instructions.

**TL;DR:**
1. Push code to GitHub
2. Connect Render to your repo
3. Add env vars (GEMINI_API_KEY, PINECONE credentials)
4. Deploy (auto-deploys on every push)
5. Update frontend VITE_BACKEND_URL with Render URL

## ⚠️ Important Notes

- `.env` files are NOT committed (security ✅)
- Embedding model (~138MB) downloads on first request
- Free Pinecone tier is plenty for personal use
- Render spins down free tier after 15 min of inactivity (cold starts are 30-60 seconds)

## 🐛 Troubleshooting

**"ModuleNotFoundError" on Render?**
- Commit and push changes to GitHub
- Render auto-redeploys

**Frontend can't reach backend?**
- Check VITE_BACKEND_URL is correct
- Verify CORS is enabled
- Check browser console (F12)

**Memory not growing?**
- Visit `/api/memory/status` endpoint
- Verify Pinecone credentials
- Check backend logs on Render dashboard

## 📞 Support

- Frontend issues? Check [frontend/Setup.md](./frontend/Setup.md)
- Backend issues? Check [backend/README.md](./backend/README.md)
- Deployment issues? Check [DEPLOY.md](./DEPLOY.md)

---

**Built with ❤️ for cognitive architecture research**

Happy building! 🚀
