from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Reminder, Customer
from app.tasks import send_reminder_task
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/reminders", tags=["reminders"])

class ReminderCreate(BaseModel):
    message: str
    send_time: datetime
    customer_id: int

class ReminderResponse(BaseModel):
    id: int
    message: str
    send_time: datetime
    customer_id: int
    status: str

    class Config:
        from_attributes = True

@router.post("/", response_model=ReminderResponse)
def create_reminder(reminder: ReminderCreate, db: Session = Depends(get_db)):
    # Check if customer exists
    customer = db.query(Customer).filter(Customer.id == reminder.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db_reminder = Reminder(
        message=reminder.message,
        send_time=reminder.send_time,
        customer_id=reminder.customer_id
    )
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.get("/", response_model=list[ReminderResponse])
def read_reminders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reminders = db.query(Reminder).offset(skip).limit(limit).all()
    return reminders

@router.get("/{reminder_id}", response_model=ReminderResponse)
def read_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder

@router.put("/{reminder_id}/status")
def update_reminder_status(reminder_id: int, status: str, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.status = status
    db.commit()
    return {"message": "Reminder status updated successfully"}

@router.post("/{reminder_id}/send")
def send_reminder_now(reminder_id: int, db: Session = Depends(get_db)):
    """Send a reminder immediately via WhatsApp using Celery"""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Get customer details
    customer = db.query(Customer).filter(Customer.id == reminder.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Send WhatsApp message via Celery task from tasks.py
    task_result = send_reminder_task.delay(customer.phone, reminder.message)

    # Update reminder status
    reminder.status = "sent"
    db.commit()

    return {
        "message": "Reminder sent via WhatsApp",
        "task_id": task_result.id,
        "customer": customer.name,
        "phone": customer.phone
    }

@router.post("/send-pending")
def send_pending_reminders(db: Session = Depends(get_db)):
    """Send all pending reminders that are due via WhatsApp using Celery"""
    now = datetime.utcnow()
    pending_reminders = db.query(Reminder).filter(
        Reminder.status == "pending",
        Reminder.send_time <= now
    ).all()

    sent_reminders = []
    for reminder in pending_reminders:
        customer = db.query(Customer).filter(Customer.id == reminder.customer_id).first()
        if customer:
            # Send WhatsApp message via Celery task from tasks.py
            task_result = send_reminder_task.delay(customer.phone, reminder.message)

            # Update reminder status
            reminder.status = "sent"
            db.commit()

            sent_reminders.append({
                "reminder_id": reminder.id,
                "task_id": task_result.id,
                "customer": customer.name,
                "phone": customer.phone
            })

    return {
        "message": f"Sent {len(sent_reminders)} pending reminders",
        "sent_reminders": sent_reminders
    }
