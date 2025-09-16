from fastapi import APIRouter, Depends, HTTPException, status, Query, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Reminder, Customer, User, ReminderFrequency
from app.routes.auth import get_current_user
from app.tasks import send_reminder_task
from app.services.twilio_service import send_whatsapp_message
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
import json
import re

router = APIRouter(tags=["Reminders"])

# Template variable pattern: {variable_name}
TEMPLATE_PATTERN = r'\{([a-zA-Z0-9_]+)\}'

class TemplateVariable(BaseModel):
    name: str
    value: str

class ReminderCreate(BaseModel):
    message: str
    send_time: datetime
    customer_id: int
    frequency: str = ReminderFrequency.ONE_TIME.value
    recurring_end_date: Optional[datetime] = None
    template_id: Optional[str] = None
    template_variables: Optional[Dict[str, str]] = None
    
    @validator('frequency')
    def validate_frequency(cls, v):
        valid_frequencies = [freq.value for freq in ReminderFrequency]
        if v not in valid_frequencies:
            raise ValueError(f"Frequency must be one of: {', '.join(valid_frequencies)}")
        return v
    
    @validator('recurring_end_date', always=True)
    def validate_recurring_end_date(cls, v, values):
        if values.get('frequency') != ReminderFrequency.ONE_TIME.value and v is None:
            raise ValueError("recurring_end_date is required for recurring reminders")
        return v

class ReminderUpdate(BaseModel):
    message: Optional[str] = None
    send_time: Optional[datetime] = None
    frequency: Optional[str] = None
    recurring_end_date: Optional[datetime] = None
    template_variables: Optional[Dict[str, str]] = None
    status: Optional[str] = None

class ReminderResponse(BaseModel):
    id: int
    message: str
    send_time: datetime
    customer_id: int
    status: str
    frequency: str
    recurring_end_date: Optional[datetime] = None
    template_id: Optional[str] = None
    template_variables: Optional[Dict[str, str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    content: str
    description: Optional[str] = None
    
    @validator('content')
    def validate_template_variables(cls, v):
        # Check if template has at least one variable
        if not re.search(TEMPLATE_PATTERN, v):
            raise ValueError("Template must contain at least one variable in format {variable_name}")
        return v

class TemplateResponse(BaseModel):
    id: str
    name: str
    content: str
    description: Optional[str] = None
    variables: List[str] = []
    
    class Config:
        from_attributes = True

# Helper functions
def extract_template_variables(template_content: str) -> List[str]:
    """Extract variable names from a template string"""
    matches = re.findall(TEMPLATE_PATTERN, template_content)
    return matches

def apply_template(template_content: str, variables: Dict[str, str]) -> str:
    """Apply variables to a template string"""
    result = template_content
    for var_name, var_value in variables.items():
        result = result.replace(f"{{{var_name}}}", var_value)
    return result

def schedule_next_recurring_reminder(reminder: Reminder, db: Session):
    """Schedule the next occurrence of a recurring reminder"""
    if reminder.frequency == ReminderFrequency.ONE_TIME.value:
        return None
    
    # Calculate next send time based on frequency
    next_send_time = None
    if reminder.frequency == ReminderFrequency.DAILY.value:
        next_send_time = reminder.send_time + timedelta(days=1)
    elif reminder.frequency == ReminderFrequency.WEEKLY.value:
        next_send_time = reminder.send_time + timedelta(weeks=1)
    elif reminder.frequency == ReminderFrequency.MONTHLY.value:
        # Simple approximation for monthly
        next_send_time = reminder.send_time + timedelta(days=30)
    
    # Check if we've reached the end date
    if next_send_time and reminder.recurring_end_date and next_send_time <= reminder.recurring_end_date:
        # Create new reminder instance for next occurrence
        new_reminder = Reminder(
            message=reminder.message,
            send_time=next_send_time,
            customer_id=reminder.customer_id,
            frequency=reminder.frequency,
            recurring_end_date=reminder.recurring_end_date,
            template_id=reminder.template_id,
            template_variables=reminder.template_variables,
            status="pending"
        )
        db.add(new_reminder)
        db.commit()
        return new_reminder
    
    return None

# Routes
@router.post("/", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    reminder: ReminderCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if customer exists and belongs to current user
    customer = db.query(Customer).filter(
        Customer.id == reminder.customer_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Process template if template_id is provided
    final_message = reminder.message
    if reminder.template_id and reminder.template_variables:
        # In a real app, you'd fetch the template from a database
        # For now, we'll use a simple dictionary of predefined templates
        templates = {
            "appointment": "Hi {name}, this is a reminder for your appointment on {date} at {time}.",
            "payment": "Hi {name}, your payment of {amount} is due on {date}. Thank you!",
            "follow_up": "Hi {name}, just following up on our conversation about {topic}."
        }
        
        if reminder.template_id not in templates:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template_content = templates[reminder.template_id]
        final_message = apply_template(template_content, reminder.template_variables)
    
    # Create reminder
    db_reminder = Reminder(
        message=final_message,
        send_time=reminder.send_time,
        customer_id=reminder.customer_id,
        frequency=reminder.frequency,
        recurring_end_date=reminder.recurring_end_date,
        template_id=reminder.template_id,
        template_variables=reminder.template_variables
    )
    
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    
    return db_reminder

@router.get("/", response_model=List[ReminderResponse])
async def read_reminders(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Start with base query for reminders linked to customers owned by current user
    query = db.query(Reminder).join(Customer).filter(Customer.owner_id == current_user.id)
    
    # Apply filters
    if status:
        query = query.filter(Reminder.status == status)
    
    if customer_id:
        query = query.filter(Reminder.customer_id == customer_id)
    
    if from_date:
        query = query.filter(Reminder.send_time >= from_date)
    
    if to_date:
        query = query.filter(Reminder.send_time <= to_date)
    
    # Get results with pagination
    reminders = query.order_by(Reminder.send_time).offset(skip).limit(limit).all()
    
    return reminders

@router.get("/{reminder_id}", response_model=ReminderResponse)
async def read_reminder(
    reminder_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get reminder and verify ownership
    reminder = db.query(Reminder).join(Customer).filter(
        Reminder.id == reminder_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return reminder

@router.put("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: int,
    reminder_update: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get reminder and verify ownership
    reminder = db.query(Reminder).join(Customer).filter(
        Reminder.id == reminder_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Update fields if provided
    if reminder_update.message is not None:
        reminder.message = reminder_update.message
    
    if reminder_update.send_time is not None:
        reminder.send_time = reminder_update.send_time
    
    if reminder_update.frequency is not None:
        reminder.frequency = reminder_update.frequency
    
    if reminder_update.recurring_end_date is not None:
        reminder.recurring_end_date = reminder_update.recurring_end_date
    
    if reminder_update.template_variables is not None:
        reminder.template_variables = reminder_update.template_variables
        
        # If template variables changed and we have a template_id, update the message
        if reminder.template_id:
            templates = {
                "appointment": "Hi {name}, this is a reminder for your appointment on {date} at {time}.",
                "payment": "Hi {name}, your payment of {amount} is due on {date}. Thank you!",
                "follow_up": "Hi {name}, just following up on our conversation about {topic}."
            }
            
            if reminder.template_id in templates:
                template_content = templates[reminder.template_id]
                reminder.message = apply_template(template_content, reminder_update.template_variables)
    
    if reminder_update.status is not None:
        reminder.status = reminder_update.status
    
    db.commit()
    db.refresh(reminder)
    
    return reminder

@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get reminder and verify ownership
    reminder = db.query(Reminder).join(Customer).filter(
        Reminder.id == reminder_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    db.delete(reminder)
    db.commit()
    
    return None

@router.post("/{reminder_id}/send", status_code=status.HTTP_200_OK)
async def send_reminder_now(
    reminder_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a reminder immediately via WhatsApp using Celery"""
    # Get reminder and verify ownership
    reminder = db.query(Reminder).join(Customer).filter(
        Reminder.id == reminder_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if reminder is None:
        raise HTTPException(status_code=404, detail="Reminder not found")

    # Get customer details
    customer = db.query(Customer).filter(Customer.id == reminder.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Send WhatsApp message via Celery task
    task_result = send_reminder_task.delay(customer.phone, reminder.message)

    # Update reminder status
    reminder.status = "sent"
    db.commit()
    
    # If this is a recurring reminder, schedule the next one
    next_reminder = schedule_next_recurring_reminder(reminder, db)

    response = {
        "message": "Reminder sent via WhatsApp",
        "task_id": task_result.id,
        "customer": customer.name,
        "phone": customer.phone
    }
    
    if next_reminder:
        response["next_reminder"] = {
            "id": next_reminder.id,
            "send_time": next_reminder.send_time
        }

    return response

@router.post("/send-pending", status_code=status.HTTP_200_OK)
async def send_pending_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send all pending reminders that are due via WhatsApp using Celery"""
    now = datetime.utcnow()
    
    # Get all pending reminders for the current user's customers
    pending_reminders = db.query(Reminder).join(Customer).filter(
        Reminder.status == "pending",
        Reminder.send_time <= now,
        Customer.owner_id == current_user.id
    ).all()

    sent_reminders = []
    next_reminders = []
    
    for reminder in pending_reminders:
        customer = db.query(Customer).filter(Customer.id == reminder.customer_id).first()
        if customer:
            # Send WhatsApp message via Celery task
            task_result = send_reminder_task.delay(customer.phone, reminder.message)

            # Update reminder status
            reminder.status = "sent"
            db.commit()

            sent_reminders.append({
                "reminder_id": reminder.id,
                "task_id": task_result.id,
                "customer": customer.name,
                "phone": customer.phone,
                "message": reminder.message[:50] + "..." if len(reminder.message) > 50 else reminder.message
            })
            
            # If this is a recurring reminder, schedule the next one
            next_reminder = schedule_next_recurring_reminder(reminder, db)
            if next_reminder:
                next_reminders.append({
                    "id": next_reminder.id,
                    "send_time": next_reminder.send_time,
                    "customer": customer.name
                })

    return {
        "message": f"Sent {len(sent_reminders)} pending reminders",
        "sent_reminders": sent_reminders,
        "next_reminders": next_reminders
    }

@router.get("/templates", response_model=List[TemplateResponse])
async def get_templates(
    current_user: User = Depends(get_current_user)
):
    """Get predefined message templates"""
    # In a real app, these would come from a database
    # For now, we'll use hardcoded templates
    templates = [
        {
            "id": "appointment",
            "name": "Appointment Reminder",
            "content": "Hi {name}, this is a reminder for your appointment on {date} at {time}.",
            "description": "Use this template for appointment reminders",
            "variables": ["name", "date", "time"]
        },
        {
            "id": "payment",
            "name": "Payment Reminder",
            "content": "Hi {name}, your payment of {amount} is due on {date}. Thank you!",
            "description": "Use this template for payment reminders",
            "variables": ["name", "amount", "date"]
        },
        {
            "id": "follow_up",
            "name": "Follow-up Message",
            "content": "Hi {name}, just following up on our conversation about {topic}.",
            "description": "Use this template for follow-up messages",
            "variables": ["name", "topic"]
        }
    ]
    
    return templates

@router.post("/preview-template")
async def preview_template(
    template_id: str = Form(...),
    variables: str = Form(...)
):
    """Preview a template with provided variables"""
    try:
        # Parse variables JSON
        vars_dict = json.loads(variables)
        
        # Get template
        templates = {
            "appointment": "Hi {name}, this is a reminder for your appointment on {date} at {time}.",
            "payment": "Hi {name}, your payment of {amount} is due on {date}. Thank you!",
            "follow_up": "Hi {name}, just following up on our conversation about {topic}."
        }
        
        if template_id not in templates:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template_content = templates[template_id]
        
        # Apply variables to template
        message = apply_template(template_content, vars_dict)
        
        return {"preview": message}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for variables")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
