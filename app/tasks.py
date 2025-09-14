from celery import Celery
from app.services.twilio_service import send_whatsapp_message

celery_app = Celery(
    "greentick",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task
def send_reminder_task(to_number: str, message: str):
    """Background task to send WhatsApp reminder"""
    result = send_whatsapp_message(to_number, message)
    return result
