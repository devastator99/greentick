from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import datetime
from enum import Enum as PyEnum

class ReminderFrequency(PyEnum):
    ONE_TIME = "one_time"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class PaymentStatus(PyEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    
    # Business profile fields
    business_name = Column(String, nullable=True)
    business_logo = Column(String, nullable=True)  # URL to logo image
    business_whatsapp = Column(String, nullable=True)
    
    # Relationships
    customers = relationship("Customer", back_populates="owner")
    payments = relationship("Payment", back_populates="owner")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String)
    notes = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    owner = relationship("User", back_populates="customers")
    reminders = relationship("Reminder", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String)
    send_time = Column(DateTime, default=datetime.datetime.utcnow)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(String, default="pending")
    
    # New fields for enhanced reminders
    template_id = Column(String, nullable=True)  # For template-based messages
    template_variables = Column(JSON, nullable=True)  # Store variables for templates
    frequency = Column(String, default=ReminderFrequency.ONE_TIME.value)
    recurring_end_date = Column(DateTime, nullable=True)  # End date for recurring reminders
    
    # Relationships
    customer = relationship("Customer", back_populates="reminders")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    description = Column(String)
    status = Column(String, default=PaymentStatus.PENDING.value)
    razorpay_payment_id = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    payment_link = Column(String, nullable=True)
    
    # Foreign keys
    customer_id = Column(Integer, ForeignKey("customers.id"))
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    customer = relationship("Customer", back_populates="payments")
    owner = relationship("User", back_populates="payments")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
