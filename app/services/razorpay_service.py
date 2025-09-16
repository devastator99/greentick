import os
import razorpay
from dotenv import load_dotenv
from typing import Dict, Any, Optional
import json

# Load environment variables
load_dotenv()

# Razorpay configuration
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

# Validate required environment variables
if not RAZORPAY_KEY_ID:
    raise ValueError("RAZORPAY_KEY_ID environment variable is required")
if not RAZORPAY_KEY_SECRET:
    raise ValueError("RAZORPAY_KEY_SECRET environment variable is required")

# Initialize Razorpay client
client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def create_order(amount: float, currency: str = "INR", receipt: Optional[str] = None, notes: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Create a new Razorpay order
    
    Args:
        amount: Amount in smallest currency unit (paise for INR)
        currency: Currency code (default: INR)
        receipt: Your receipt id
        notes: Additional notes for the order
        
    Returns:
        Razorpay order details
    """
    try:
        # Convert amount to paise (Razorpay expects amount in smallest currency unit)
        amount_in_paise = int(amount * 100)
        
        data = {
            "amount": amount_in_paise,
            "currency": currency,
        }
        
        if receipt:
            data["receipt"] = receipt
            
        if notes:
            data["notes"] = notes
            
        order = client.order.create(data=data)
        return order
    except Exception as e:
        return {"error": str(e)}

def create_payment_link(amount: float, customer_name: str, customer_email: str, 
                       customer_phone: str, description: str, 
                       callback_url: Optional[str] = None, 
                       callback_method: str = "get") -> Dict[str, Any]:
    """
    Create a payment link that can be shared with customers
    
    Args:
        amount: Amount in INR
        customer_name: Name of the customer
        customer_email: Email of the customer
        customer_phone: Phone number of the customer
        description: Description of the payment
        callback_url: URL to redirect after payment
        callback_method: HTTP method for callback
        
    Returns:
        Payment link details
    """
    try:
        # Convert amount to paise
        amount_in_paise = int(amount * 100)
        
        data = {
            "amount": amount_in_paise,
            "currency": "INR",
            "accept_partial": False,
            "description": description,
            "customer": {
                "name": customer_name,
                "email": customer_email,
                "contact": customer_phone
            },
            "notify": {
                "sms": True,
                "email": True
            },
            "reminder_enable": True,
        }
        
        if callback_url:
            data["callback_url"] = callback_url
            data["callback_method"] = callback_method
            
        payment_link = client.payment_link.create(data=data)
        return payment_link
    except Exception as e:
        return {"error": str(e)}

def verify_payment_signature(payment_id: str, order_id: str, signature: str) -> bool:
    """
    Verify the payment signature to confirm payment authenticity
    
    Args:
        payment_id: Razorpay payment ID
        order_id: Razorpay order ID
        signature: Razorpay signature
        
    Returns:
        True if signature is valid, False otherwise
    """
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature
        })
        return True
    except Exception:
        return False

def get_payment_details(payment_id: str) -> Dict[str, Any]:
    """
    Get details of a payment
    
    Args:
        payment_id: Razorpay payment ID
        
    Returns:
        Payment details
    """
    try:
        payment = client.payment.fetch(payment_id)
        return payment
    except Exception as e:
        return {"error": str(e)}

def get_payment_link_details(payment_link_id: str) -> Dict[str, Any]:
    """
    Get details of a payment link
    
    Args:
        payment_link_id: Razorpay payment link ID
        
    Returns:
        Payment link details
    """
    try:
        payment_link = client.payment_link.fetch(payment_link_id)
        return payment_link
    except Exception as e:
        return {"error": str(e)}

def generate_invoice_pdf(payment_id: str) -> bytes:
    """
    Generate an invoice PDF for a payment
    
    Args:
        payment_id: Razorpay payment ID
        
    Returns:
        PDF content as bytes
    """
    try:
        invoice = client.invoice.fetch(payment_id)
        # In a real implementation, you would generate a PDF here
        # For now, we'll just return a placeholder
        return b"PDF content would be here"
    except Exception as e:
        return b""
