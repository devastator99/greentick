from fastapi import FastAPI
from app.routes import auth, customers, reminders, payments

app = FastAPI(title="Greentick API")

# Register routes
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(customers.router, prefix="/customers", tags=["Customers"])
app.include_router(reminders.router, prefix="/reminders", tags=["Reminders"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])

@app.get("/")
def root():
    return {"message": "Welcome to Greentick API 🚀"}
