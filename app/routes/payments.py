from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/payments", tags=["payments"])

class PaymentCreate(BaseModel):
    amount: float
    description: str
    customer_id: int

class PaymentResponse(BaseModel):
    id: int
    amount: float
    description: str
    customer_id: int
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=PaymentResponse)
def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    # For now, just return a placeholder response
    # You can extend this with actual payment processing logic
    return {
        "id": 1,
        "amount": payment.amount,
        "description": payment.description,
        "customer_id": payment.customer_id,
        "created_at": datetime.utcnow()
    }

@router.get("/", response_model=list[PaymentResponse])
def read_payments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Placeholder for now - you can add actual payment model later
    return []

@router.get("/{payment_id}", response_model=PaymentResponse)
def read_payment(payment_id: int, db: Session = Depends(get_db)):
    # Placeholder for now
    raise HTTPException(status_code=404, detail="Payment not found")
