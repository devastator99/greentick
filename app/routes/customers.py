from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Customer, User
from app.routes.auth import get_current_user
from pydantic import BaseModel, Field
from typing import Optional, List
import csv
import io

router = APIRouter(tags=["Customers"])

class CustomerCreate(BaseModel):
    name: str
    phone: str
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: str
    notes: Optional[str] = None
    owner_id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class BulkImportResponse(BaseModel):
    success_count: int
    failed_count: int
    failed_rows: List[dict] = []

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer: CustomerCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_customer = Customer(
        name=customer.name, 
        phone=customer.phone,
        notes=customer.notes,
        owner_id=current_user.id
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/", response_model=List[CustomerResponse])
async def read_customers(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Customer).filter(Customer.owner_id == current_user.id)
    
    # Add search functionality
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(search_term)) | 
            (Customer.phone.ilike(search_term)) |
            (Customer.notes.ilike(search_term))
        )
    
    customers = query.offset(skip).limit(limit).all()
    return customers

@router.get("/{customer_id}", response_model=CustomerResponse)
async def read_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Update customer fields if provided
    if customer_update.name is not None:
        db_customer.name = customer_update.name
    if customer_update.phone is not None:
        db_customer.phone = customer_update.phone
    if customer_update.notes is not None:
        db_customer.notes = customer_update.notes
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.owner_id == current_user.id
    ).first()
    
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    db.delete(db_customer)
    db.commit()
    return None

@router.post("/bulk-import", response_model=BulkImportResponse)
async def bulk_import_customers(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported"
        )
    
    # Process CSV file
    contents = await file.read()
    buffer = io.StringIO(contents.decode('utf-8'))
    csv_reader = csv.DictReader(buffer)
    
    success_count = 0
    failed_count = 0
    failed_rows = []
    
    for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 to account for header row
        try:
            # Check required fields
            if 'name' not in row or 'phone' not in row:
                failed_rows.append({
                    "row": row_num,
                    "data": row,
                    "error": "Missing required fields (name, phone)"
                })
                failed_count += 1
                continue
            
            # Check if customer with same phone already exists
            existing_customer = db.query(Customer).filter(
                Customer.phone == row['phone'],
                Customer.owner_id == current_user.id
            ).first()
            
            if existing_customer:
                failed_rows.append({
                    "row": row_num,
                    "data": row,
                    "error": f"Customer with phone {row['phone']} already exists"
                })
                failed_count += 1
                continue
            
            # Create new customer
            notes = row.get('notes', None)
            db_customer = Customer(
                name=row['name'],
                phone=row['phone'],
                notes=notes,
                owner_id=current_user.id
            )
            db.add(db_customer)
            success_count += 1
            
        except Exception as e:
            failed_rows.append({
                "row": row_num,
                "data": row,
                "error": str(e)
            })
            failed_count += 1
    
    # Commit all successful additions
    db.commit()
    
    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "failed_rows": failed_rows
    }
