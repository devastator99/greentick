from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Customer, User
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/customers", tags=["Customers"])

class CustomerCreate(BaseModel):
    name: str
    phone: str

class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: str
    owner_id: Optional[int] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=CustomerResponse)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    # For simplicity, we'll find or create a default user.
    # In a real app, you'd get the user from auth dependencies.
    default_user = db.query(User).filter(User.email == "default@user.com").first()
    if not default_user:
        default_user = User(email="default@user.com", hashed_password="default")
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    db_customer = Customer(
        name=customer.name, 
        phone=customer.phone,
        owner_id=default_user.id
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/", response_model=list[CustomerResponse])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    customers = db.query(Customer).offset(skip).limit(limit).all()
    return customers

@router.get("/{customer_id}", response_model=CustomerResponse)
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
