# WhatsApp Business API Integration for COGNITEX-AI

Chat with COGNITEX-AI directly via WhatsApp Business API! This guide shows how to set up WhatsApp integration.

---

## **Quick Overview**

```
User sends WhatsApp message → Webhook receives it → COGNITEX-AI processes → Response sent back via WhatsApp
```

**Features:**
- 💬 Real-time chat via WhatsApp
- 🧠 Full access to episodic memory (Pinecone)
- ⚡ Powered by HuggingFace AutoRouter
- 📱 For WhatsApp Business accounts only

---

## **Prerequisites**

1. **WhatsApp Business Account** (free, but requires verification)
2. **Meta Business Account** 
3. **Backend deployed** (Render, Heroku, etc.) with HTTPS

---

## **Step 1: Create WhatsApp Business Account**

### 1a. Sign Up for Meta Business
1. Go to [business.facebook.com](https://business.facebook.com)
2. Click "Create Account"
3. Fill in business details
4. Create/verify your business

### 1b. Set Up WhatsApp Integration
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Navigate to "My Apps" → "Create App"
3. Choose "Business" app type
4. Configure as follows:
   - **App Name**: COGNITEX-WhatsApp
   - **App Purpose**: Business Messaging
5. Add "WhatsApp" product to your app

---

## **Step 2: Get WhatsApp Credentials**

In your Meta app dashboard:

1. **Phone Number ID**
   - Go to WhatsApp → Settings → Phone Numbers
   - Copy your **Phone Number ID**

2. **Business Account ID**
   - Go to Settings → Business Accounts
   - Copy your **Business Account ID**

3. **Access Token**
   - Go to Settings → App Roles
   - Generate a **permanent access token** (or use system user token)
   - Scope needed: `whatsapp_business_messaging`

---

## **Step 3: Configure Environment Variables**

Update your `.env` file in the backend:

```bash
# WhatsApp Business API
WHATSAPP_BUSINESS_ACCOUNT_ID=YOUR_BUSINESS_ACCOUNT_ID
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_webhook_token_12345
```

**Generate a secure webhook token:**
```bash
python -c "import secrets; print(secrets.token_hex(16))"
```

---

## **Step 4: Set Up Webhook URL**

### 4a. Deploy Backend
Your backend must be **publicly accessible via HTTPS**:

- **Local testing**: Use ngrok
  ```bash
  ngrok http 8000
  ```
  Your URL: `https://your-ngrok-url.ngrok.io`

- **Production**: Deploy to Render, Heroku, etc.
  Your URL: `https://your-backend-domain.com`

### 4b. Configure Webhook in Meta Dashboard

1. Go to WhatsApp → Configuration
2. **Webhook URL**:
   ```
   https://your-backend-domain.com/api/whatsapp/webhook
   ```

3. **Verify Token**: 
   - Paste the token from Step 3 (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`)

4. **Subscribe to Events**:
   - Select `messages` (to receive messages)

5. Click **Verify and Save**

**Meta will send a GET request to verify your webhook!**

---

## **Step 5: Test the Integration**

### 5a. Check Status
```bash
curl https://your-backend-domain.com/api/whatsapp/status
```

Response:
```json
{
  "whatsapp_configured": true,
  "webhook_url": "/api/whatsapp/webhook",
  "status": "ready"
}
```

### 5b. Send a Test Message

1. Open WhatsApp
2. Chat with your WhatsApp Business number
3. Send a message: `Hello COGNITEX`
4. Wait for response (may take 5-10 seconds first time)

**Example:**
- **You**: "How do I fix CORS errors?"
- **COGNITEX**: "CORS (Cross-Origin Resource Sharing) errors occur when... [response from COGNITEX-AI with memory context]"

---

## **API Endpoints**

### **GET `/api/whatsapp/webhook`**
Webhook verification (called by WhatsApp automatically)

Query params:
- `hub_mode`: "subscribe"
- `hub_challenge`: Challenge string from WhatsApp
- `hub_verify_token`: Token to verify

### **POST `/api/whatsapp/webhook`**
Receives incoming messages from WhatsApp

Body (sent by WhatsApp):
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "1234567890",
                "id": "msg_id_12345",
                "text": {"body": "Hello COGNITEX"}
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### **GET `/api/whatsapp/status`**
Check WhatsApp integration status

Response:
```json
{
  "whatsapp_configured": true,
  "webhook_url": "/api/whatsapp/webhook",
  "status": "ready"
}
```

---

## **Message Handling**

### **Incoming Message Flow**
```
WhatsApp User Message
    ↓
Webhook receives (POST /api/whatsapp/webhook)
    ↓
Parse phone number & text
    ↓
Call COGNITEX-AI (/api/chat)
    ↓
Retrieve episodic memories from Pinecone
    ↓
Generate response via HuggingFace AutoRouter
    ↓
Format for WhatsApp (remove markdown, truncate)
    ↓
Send via WhatsApp Business API
    ↓
Message appears in WhatsApp chat
```

### **Message Limits**
- **Max per message**: 1024 characters
- **Longer messages**: Auto-split into multiple messages
- **Response time**: 1-10 seconds (depends on memory retrieval)

### **Message Format**
Responses are automatically cleaned:
- ✅ Removes markdown formatting (`**`, `````, etc.)
- ✅ Truncates long responses to 500 chars
- ✅ Adds footer: "🧠 COGNITEX-AI | Powered by HuggingFace AutoRouter"

---

## **Troubleshooting**

### **Webhook Not Verifying**
❌ Error: "Invalid token"
✅ Solution:
- Double-check `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches in both `.env` and Meta dashboard
- Restart backend after changing env vars

### **Messages Not Being Received**
❌ No response to WhatsApp messages
✅ Solutions:
- Check backend logs: `docker logs your-container` or `tail -f logs.txt`
- Verify webhook URL is publicly accessible: `curl https://your-url/api/whatsapp/webhook?hub_mode=subscribe&hub_challenge=test&hub_verify_token=TOKEN`
- Confirm access token is valid (try `/api/whatsapp/status`)

### **Access Token Expired**
❌ Error: "Invalid access token"
✅ Solution:
- Generate new token from Meta dashboard
- Update `.env` and restart backend

### **WhatsApp Number Not Verified**
❌ Cannot send/receive messages
✅ Solution:
- Verify your business phone number in Meta dashboard
- Wait for verification (24-48 hours typically)
- Use verified business number for testing

---

## **Monitoring**

### **Logs**
Check backend logs for WhatsApp events:
```
✓ WhatsApp webhook verified
📱 WhatsApp message from 1234567890: Hello COGNITEX
🔍 Getting COGNITEX response for WhatsApp...
✓ Received response from Gemini
✓ Response sent to WhatsApp
```

### **Health Check**
Periodically ping status endpoint:
```bash
curl https://your-backend-domain.com/api/whatsapp/status
```

---

## **Production Checklist**

- [ ] Backend deployed with HTTPS
- [ ] `.env` configured with all WhatsApp credentials
- [ ] Webhook URL verified in Meta dashboard
- [ ] Business phone number verified
- [ ] Access token is valid and permanent
- [ ] Message testing completed
- [ ] Logs monitored for errors
- [ ] Rate limiting considered (if high volume)

---

## **Architecture Diagram**

```
┌─────────────────┐
│  WhatsApp User  │
└────────┬────────┘
         │ sends message
         ▼
┌─────────────────────────────────────────┐
│   Meta WhatsApp Business API            │
│   (graph.instagram.com)                 │
└────────┬────────────────────────────────┘
         │ POST /api/whatsapp/webhook
         ▼
┌─────────────────────────────────────────┐
│   Your Backend (FastAPI)                │
│   - Parse message                       │
│   - Call /api/chat                      │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌─────────┐
│Pinecone│ │HuggingFace
│MemDB  │ │AutoRouter
└────────┘ └─────────┘
    ▲         │
    │         ▼
    └─ COGNITEX-AI Response
         │
         ▼
┌─────────────────────────────────────────┐
│   Meta WhatsApp Business API            │
│   (Send response)                       │
└────────┬────────────────────────────────┘
         │ sends message
         ▼
┌─────────────────┐
│  WhatsApp User  │
│  receives reply │
└─────────────────┘
```

---

## **Advanced Configuration**

### **Rate Limiting**
To prevent abuse, add rate limiting in `main.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/whatsapp/webhook")
@limiter.limit("10/minute")
async def handle_whatsapp_webhook(request: Request, webhook: WhatsAppWebhook):
    # ... existing code
```

### **Message Queue**
For high volume, use Celery/Redis:

```python
# In production, queue messages instead of processing synchronously
from celery import Celery

celery_app = Celery('tasks', broker='redis://localhost:6379')

@celery_app.task
def process_whatsapp_message(phone_number, message_text):
    # Process in background
    response_data = get_chat_response(message_text)
    send_whatsapp_message(phone_number, response_data['response'])
```

---

## **Support**

For issues:
1. Check logs: `docker logs backend` or `tail -f backend/logs.txt`
2. Verify credentials in Meta dashboard
3. Test webhook endpoint directly:
   ```bash
   curl -X POST https://your-url/api/whatsapp/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "object": "whatsapp_business_account",
       "entry": [{
         "changes": [{
           "value": {
             "messages": [{
               "from": "1234567890",
               "text": {"body": "test"}
             }]
           }
         }]
       }]
     }'
   ```

---

**Happy chatting with COGNITEX-AI on WhatsApp! 🚀**
