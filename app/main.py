from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, customers, reminders, payments

app = FastAPI(title="GreenTick")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Mount static files (CSS, JS)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Register API routes
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(customers.router, prefix="/customers", tags=["Customers"])
app.include_router(reminders.router, prefix="/reminders", tags=["Reminders"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main HTML frontend."""
    return templates.TemplateResponse("index.html", {"request": request})
