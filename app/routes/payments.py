from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks, Query
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Payment, Customer, User, PaymentStatus
from app.routes.auth import get_current_user
from app.services import razorpay_service, twilio_service
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import io
import json
import uuid

router = APIRouter(tags=["Payments"])

class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0)
    description: str
    customer_id: int
    send_payment_link: bool = True
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v

class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    amount: float
    description: str
    customer_id: int
    status: str
    payment_link: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PaymentLinkResponse(BaseModel):
    payment_id: int
    payment_link: str
    short_url: str
    razorpay_payment_link_id: str
    razorpay_payment_link_reference_id: str
    customer_name: str
    customer_phone: str

class PaymentWebhookData(BaseModel):
    payment_link_id: str
    payment_link_reference_id: str
    payment_id: Optional[str] = None
    status: str
    
# Helper functions
def send_payment_link_to_customer(customer_phone: str, payment_link: str, amount: float, description: str):
    """Send payment link to customer via WhatsApp"""
    message = f"Hello! Here's your payment link for {description} (₹{amount}): {payment_link}"
    return twilio_service.send_whatsapp_message(customer_phone, message)

def generate_invoice_pdf(payment: Payment, customer: Customer, db: Session):
    """Generate invoice PDF for a payment"""
    # In a real implementation, you would generate a proper PDF with a library like ReportLab
    # For now, we'll just create a simple text-based invoice
    invoice_content = f"""INVOICE
    
    Invoice #: INV-{payment.id}-{uuid.uuid4().hex[:6]}
    Date: {payment.created_at.strftime('%Y-%m-%d')}
    
    Customer: {customer.name}
    Phone: {customer.phone}
    
    Description: {payment.description}
    Amount: ₹{payment.amount}
    
    Status: {payment.status}
    
    Thank you for your business!
    """
    
    return invoice_content.encode('utf-8')

@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment: PaymentCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if customer exists and belongs to current user
    customer = db.query(Customer).filter(
        Customer.id == payment.customer_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Create payment record
    db_payment = Payment(
        amount=payment.amount,
        description=payment.description,
        customer_id=payment.customer_id,
        owner_id=current_user.id,
        status=PaymentStatus.PENDING.value
    )
    
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    
    # Create payment link with Razorpay if requested
    if payment.send_payment_link:
        # Create Razorpay payment link
        payment_link_response = razorpay_service.create_payment_link(
            amount=payment.amount,
            customer_name=customer.name,
            customer_email="customer@example.com",  # In a real app, you'd have customer email
            customer_phone=customer.phone,
            description=payment.description,
            callback_url=f"https://yourdomain.com/payments/callback/{db_payment.id}"
        )
        
        if "error" in payment_link_response:
            # If there's an error, we'll still keep the payment record but mark the error
            db_payment.status = "error"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create payment link: {payment_link_response['error']}"
            )
        
        # Update payment record with payment link
        db_payment.payment_link = payment_link_response.get("short_url")
        db_payment.razorpay_order_id = payment_link_response.get("order_id")
        db.commit()
        db.refresh(db_payment)
        
        # Send payment link to customer via WhatsApp in background
        background_tasks.add_task(
            send_payment_link_to_customer,
            customer.phone,
            db_payment.payment_link,
            payment.amount,
            payment.description
        )
    
    return db_payment

@router.get("/", response_model=List[PaymentResponse])
async def read_payments(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Start with base query for payments owned by current user
    query = db.query(Payment).filter(Payment.owner_id == current_user.id)
    
    # Apply filters
    if status:
        query = query.filter(Payment.status == status)
    
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)
    
    if from_date:
        query = query.filter(Payment.created_at >= from_date)
    
    if to_date:
        query = query.filter(Payment.created_at <= to_date)
    
    # Get results with pagination
    payments = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()
    
    return payments

@router.get("/{payment_id}", response_model=PaymentResponse)
async def read_payment(
    payment_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get payment and verify ownership
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.owner_id == current_user.id
    ).first()
    
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return payment

@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get payment and verify ownership
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.owner_id == current_user.id
    ).first()
    
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Update fields if provided
    if payment_update.status is not None:
        payment.status = payment_update.status
    
    if payment_update.razorpay_payment_id is not None:
        payment.razorpay_payment_id = payment_update.razorpay_payment_id
    
    if payment_update.razorpay_order_id is not None:
        payment.razorpay_order_id = payment_update.razorpay_order_id
    
    db.commit()
    db.refresh(payment)
    
    return payment

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get payment and verify ownership
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.owner_id == current_user.id
    ).first()
    
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    db.delete(payment)
    db.commit()
    
    return None

@router.post("/{payment_id}/send-link", response_model=PaymentLinkResponse)
async def send_payment_link(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get payment and verify ownership
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.owner_id == current_user.id
    ).first()
    
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get customer
    customer = db.query(Customer).filter(Customer.id == payment.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # If payment link already exists, resend it
    if payment.payment_link:
        # Send existing payment link
        result = send_payment_link_to_customer(
            customer.phone,
            payment.payment_link,
            payment.amount,
            payment.description
        )
        
        return {
            "payment_id": payment.id,
            "payment_link": payment.payment_link,
            "short_url": payment.payment_link,
            "razorpay_payment_link_id": payment.razorpay_order_id or "",
            "razorpay_payment_link_reference_id": str(payment.id),
            "customer_name": customer.name,
            "customer_phone": customer.phone
        }
    
    # Create new payment link
    payment_link_response = razorpay_service.create_payment_link(
        amount=payment.amount,
        customer_name=customer.name,
        customer_email="customer@example.com",  # In a real app, you'd have customer email
        customer_phone=customer.phone,
        description=payment.description,
        callback_url=f"https://yourdomain.com/payments/callback/{payment.id}"
    )
    
    if "error" in payment_link_response:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment link: {payment_link_response['error']}"
        )
    
    # Update payment record with payment link
    payment.payment_link = payment_link_response.get("short_url")
    payment.razorpay_order_id = payment_link_response.get("order_id")
    db.commit()
    db.refresh(payment)
    
    # Send payment link to customer
    send_payment_link_to_customer(
        customer.phone,
        payment.payment_link,
        payment.amount,
        payment.description
    )
    
    return {
        "payment_id": payment.id,
        "payment_link": payment.payment_link,
        "short_url": payment_link_response.get("short_url", ""),
        "razorpay_payment_link_id": payment_link_response.get("id", ""),
        "razorpay_payment_link_reference_id": payment_link_response.get("reference_id", str(payment.id)),
        "customer_name": customer.name,
        "customer_phone": customer.phone
    }

@router.get("/{payment_id}/invoice", response_class=StreamingResponse)
async def get_invoice(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get payment and verify ownership
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.owner_id == current_user.id
    ).first()
    
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Get customer
    customer = db.query(Customer).filter(Customer.id == payment.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Generate invoice PDF
    invoice_pdf = generate_invoice_pdf(payment, customer, db)
    
    # Return PDF as streaming response
    return StreamingResponse(
        io.BytesIO(invoice_pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{payment.id}.pdf"}
    )

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    webhook_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Handle Razorpay webhook events"""
    try:
        # Verify webhook signature (in a real app)
        # signature = request.headers.get("X-Razorpay-Signature")
        # is_valid = razorpay_service.verify_webhook_signature(json.dumps(webhook_data), signature)
        # if not is_valid:
        #     raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Process webhook event
        event = webhook_data.get("event")
        
        if event == "payment_link.paid":
            # Payment completed successfully
            payload = webhook_data.get("payload", {}).get("payment_link", {})
            reference_id = payload.get("reference_id")
            payment_id = payload.get("razorpay_payment_id")
            
            if reference_id and reference_id.isdigit():
                # Find the payment by reference_id
                payment = db.query(Payment).filter(Payment.id == int(reference_id)).first()
                
                if payment:
                    # Update payment status
                    payment.status = PaymentStatus.COMPLETED.value
                    payment.razorpay_payment_id = payment_id
                    db.commit()
                    
                    # Get customer
                    customer = db.query(Customer).filter(Customer.id == payment.customer_id).first()
                    if customer:
                        # Send confirmation message
                        message = f"Thank you! Your payment of ₹{payment.amount} for {payment.description} has been received."
                        twilio_service.send_whatsapp_message(customer.phone, message)
        
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/stats/summary")
async def get_payment_stats(
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get payment statistics for dashboard"""
    # Base query for user's payments
    query = db.query(Payment).filter(Payment.owner_id == current_user.id)
    
    # Apply date filters if provided
    if from_date:
        query = query.filter(Payment.created_at >= from_date)
    
    if to_date:
        query = query.filter(Payment.created_at <= to_date)
    
    # Get all relevant payments
    payments = query.all()
    
    # Calculate statistics
    total_payments = len(payments)
    total_amount = sum(payment.amount for payment in payments)
    completed_payments = sum(1 for payment in payments if payment.status == PaymentStatus.COMPLETED.value)
    pending_payments = sum(1 for payment in payments if payment.status == PaymentStatus.PENDING.value)
    failed_payments = sum(1 for payment in payments if payment.status == PaymentStatus.FAILED.value)
    
    # Calculate completion rate
    completion_rate = (completed_payments / total_payments * 100) if total_payments > 0 else 0
    
    return {
        "total_payments": total_payments,
        "total_amount": total_amount,
        "completed_payments": completed_payments,
        "pending_payments": pending_payments,
        "failed_payments": failed_payments,
        "completion_rate": round(completion_rate, 2)
    }
