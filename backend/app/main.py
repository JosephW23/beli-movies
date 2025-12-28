from fastapi import Depends, FastAPI
from sqlmodel import Session, text
from app.db.session import get_session
from app.db.init_db import init_db

app = FastAPI(title="Movie Taste API")

@app.on_event("startup")
def on_startup() -> None:
    init_db()

@app.get("/health")
def health_check():
    return {"status":"ok"}

#Confirm DB is truly connected
@app.get("/db-health")
def db_health(session: Session = Depends(get_session)):
    session.exec(text("SELECT 1"))
    return {"db": "ok"}


