from twilio.rest import Client
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")

# Validate required environment variables
if not TWILIO_ACCOUNT_SID:
    raise ValueError("TWILIO_ACCOUNT_SID environment variable is required")
if not TWILIO_AUTH_TOKEN:
    raise ValueError("TWILIO_AUTH_TOKEN environment variable is required")
if not TWILIO_WHATSAPP_NUMBER:
    raise ValueError("TWILIO_WHATSAPP_NUMBER environment variable is required")

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def send_whatsapp_message(to_number: str, message: str):
    """Send WhatsApp message via Twilio"""
    try:
        msg = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=message,
            to=f"whatsapp:{to_number}"
        )
        return {"sid": msg.sid, "status": msg.status}
    except Exception as e:
        return {"error": str(e)}
