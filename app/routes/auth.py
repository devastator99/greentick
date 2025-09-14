from fastapi import APIRouter

router = APIRouter()

@router.post("/signup")
def signup():
    return {"message": "User registered"}

@router.post("/login")
def login():
    return {"access_token": "fake-jwt"}
