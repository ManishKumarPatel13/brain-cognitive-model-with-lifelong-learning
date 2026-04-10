"""
WhatsApp Business API Integration for COGNITEX-AI
Handles incoming messages and sends responses via WhatsApp
"""

import requests
import json
import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# WhatsApp API Configuration
WHATSAPP_API_URL = "https://graph.instagram.com/v18.0"
WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WEBHOOK_VERIFY_TOKEN = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "cognitex_webhook_token")


def verify_webhook(token: str) -> bool:
    """Verify webhook token from WhatsApp"""
    return token == WEBHOOK_VERIFY_TOKEN


def parse_whatsapp_message(webhook_data: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """
    Parse incoming WhatsApp message from webhook
    
    Returns:
        Dict with 'phone_number' and 'message_text', or None if not a message
    """
    try:
        # Extract message data
        entry = webhook_data.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])
        
        if not messages:
            return None
        
        message = messages[0]
        phone_number = message.get("from")
        
        # Handle text messages
        if "text" in message:
            text = message["text"]["body"]
            return {
                "phone_number": phone_number,
                "message_text": text,
                "message_id": message.get("id")
            }
        
        logger.info(f"Non-text message from {phone_number}: {message.get('type', 'unknown')}")
        return None
        
    except (KeyError, IndexError) as e:
        logger.error(f"Error parsing WhatsApp webhook: {e}")
        return None


def send_whatsapp_message(phone_number: str, message_text: str) -> bool:
    """
    Send a message to a WhatsApp user
    
    Args:
        phone_number: Recipient's phone number (with country code)
        message_text: Text message to send
        
    Returns:
        True if message sent successfully, False otherwise
    """
    if not all([WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN]):
        logger.error("WhatsApp credentials not configured")
        return False
    
    try:
        url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        
        # Break long messages into chunks (WhatsApp limit ~1024 chars per message)
        max_length = 1024
        messages = [message_text[i:i + max_length] for i in range(0, len(message_text), max_length)]
        
        for msg in messages:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": phone_number,
                "type": "text",
                "text": {"preview_url": False, "body": msg},
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Failed to send WhatsApp message: {response.text}")
                return False
            
            logger.info(f"WhatsApp message sent to {phone_number}")
        
        return True
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error sending WhatsApp message: {e}")
        return False


def format_cognitex_response_for_whatsapp(api_response: str) -> str:
    """
    Format COGNITEX-AI response for WhatsApp
    Remove markdown formatting and long content
    """
    # Remove markdown formatting
    response = api_response.replace("**", "").replace("```", "")
    response = response.replace("##", "").replace("###", "")
    
    # Keep only first 500 chars + ellipsis if too long
    if len(response) > 500:
        response = response[:500] + "\n\n[Message truncated - use web app for full response]"
    
    return response.strip()


async def handle_whatsapp_message(
    phone_number: str, 
    message_text: str, 
    chat_function
) -> bool:
    """
    Main handler for WhatsApp messages
    
    Args:
        phone_number: User's phone number
        message_text: User's message
        chat_function: Async function to call for chat (expected to be /api/chat)
        
    Returns:
        True if successfully processed, False otherwise
    """
    try:
        # Send "typing..." indicator
        logger.info(f"WhatsApp message from {phone_number}: {message_text}")
        
        # Call COGNITEX-AI
        response_data = await chat_function(message_text)
        
        if response_data.get("status") != "success":
            error_msg = f"❌ Error: {response_data.get('error', 'Unknown error')}"
            return send_whatsapp_message(phone_number, error_msg)
        
        # Format response for WhatsApp
        ai_response = response_data.get("response", "No response generated")
        whatsapp_response = format_cognitex_response_for_whatsapp(ai_response)
        
        # Add metadata footer for WhatsApp
        episode_info = f"\n\n🧠 *COGNITEX-AI*\nMemory System: Live | Model: HuggingFace AutoRouter"
        
        final_response = whatsapp_response + episode_info
        
        # Send response
        return send_whatsapp_message(phone_number, final_response)
        
    except Exception as e:
        logger.error(f"Error handling WhatsApp message: {e}")
        error_msg = f"❌ Processing error: {str(e)[:200]}"
        send_whatsapp_message(phone_number, error_msg)
        return False
