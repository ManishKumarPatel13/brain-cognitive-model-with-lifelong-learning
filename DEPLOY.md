# 🚀 Deployment Guide — Render.com

## Prerequisites
- ✅ GitHub account
- ✅ Gemini API key (from `.env`)
- ✅ Pinecone credentials (from `.env`)

## Step 1: Push Code to GitHub

```bash
cd /home/lazycoder/Downloads/college_project

# Initialize git if not already done
git init
git add .
git commit -m "Add Pinecone memory system and Render deployment"
git remote add origin https://github.com/YOUR_USERNAME/college_project.git
git branch -M main
git push -u origin main
```

If repo already exists:
```bash
git add .
git commit -m "Ready for Render deployment"
git push
```

## Step 2: Deploy to Render

1. **Go to [render.com](https://render.com)** and sign in with GitHub
2. Click **"New +"** → **"Blueprint"**
3. Select your `college_project` repository
4. Click **"Connect"**
5. Render will auto-detect `render.yaml` and ask for environment variables

## Step 3: Add Secrets to Render

After clicking "Deploy", you'll be prompted to fill in environment variables:

```
GEMINI_API_KEY: AIzaSyDwUYBLvM8SvkwBhHT3yVnQcBqTRbaAK2w
PINECONE_API_KEY: pcsk_6i5Vc9_G9tqSoKZXznKskxH6N1eLLpgsESfaeqg956vDdV3UZgFJ7uqSQqfZLHRKULhos6
PINECONE_ENVIRONMENT: gcp-starter
```

✅ **DO NOT** commit these into git — Render stores them securely.

## Step 4: Wait for Deployment

- Render builds your app (~2-3 minutes)
- You'll see build logs in real-time
- Once done, you get a URL like: `https://brain-monitor-api-xyz.render.com`

## Step 5: Update Frontend to Use Deployed Backend

Edit [frontend/src/pages/Dashboard.tsx](../frontend/src/pages/Dashboard.tsx):

Find this line (~line 365):
```typescript
const response = await fetch("http://localhost:8000/api/chat", {
```

Update to:
```typescript
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const response = await fetch(`${BACKEND_URL}/api/chat`, {
```

Or for production:
```typescript
const BACKEND_URL = "https://brain-monitor-api-xyz.render.com";  // Replace with your Render URL
const response = await fetch(`${BACKEND_URL}/api/chat`, {
```

## Step 6: Test the Deployed Backend

```bash
# Test health check
curl https://brain-monitor-api-xyz.render.com/

# Test memory status
curl https://brain-monitor-api-xyz.render.com/api/memory/status

# Test chat endpoint
curl -X POST https://brain-monitor-api-xyz.render.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello COGNITEX-AI"}'
```

## Step 7: Run Frontend Locally

Now your frontend talks to the deployed backend:

```bash
cd frontend
pnpm dev
```

Open http://localhost:5173 and start chatting!

---

## 🎯 What Now?

✅ **Backend** - Running on Render (handles: embeddings, Pinecone, Gemini)  
✅ **Frontend** - Running locally (lightweight React dev server)  
✅ **Memory** - Persisted in Pinecone cloud (survives server restarts)  
✅ **Your Hardware** - Finally at peace ☮️

## Troubleshooting

### Deployment fails with "ModuleNotFoundError"
- Check `requirements.txt` has all dependencies
- Re-push to github: `git push`
- Trigger redeploy in Render dashboard

### Frontend can't reach backend
- Check the Render URL is correct
- Ensure CORS is enabled (it is by default)
- Check browser console for errors (F12)

### Memory not persisting
- Check Pinecone credentials in Render env vars
- Visit `/api/memory/status` endpoint to verify connection

### High memory during first run
The embedding model (~138MB) downloads on first request. This is normal and only happens once.

---

**Questions? Check Render logs in dashboard → Logs tab**
