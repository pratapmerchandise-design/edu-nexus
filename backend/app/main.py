import os
import sys

# Ensure root workspace directory is in python path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.database import engine, Base, SessionLocal
from backend.app.models import User, Profile
from backend.app.auth.security import get_password_hash
from fastapi.staticfiles import StaticFiles
from backend.app.api import auth, users, posts, discover, forums, opportunities, messages, notifications, admin, upload

# Create tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Edu Nexus V1 API",
    description="Student social + collaboration + opportunity platform backend API",
    version="1.0.0"
)

# CORS setup
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(discover.router, prefix="/api")
app.include_router(forums.router, prefix="/api")
app.include_router(opportunities.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(upload.router, prefix="/api")

# Mount uploads directory
UPLOAD_DIR = os.path.join(root_dir, "backend", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Seed default admin user if not present
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@edunexus.org",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin_user)
            db.flush()
            admin_profile = Profile(
                user_id=admin_user.id,
                full_name="Edu Nexus Moderator",
                avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
                bio="Official platform administrator and moderator."
            )
            db.add(admin_profile)

        # Seed initial sample student user if empty
        sample_user = db.query(User).filter(User.username == "aarav").first()
        if not sample_user:
            sample_user = User(
                username="aarav",
                email="aarav@edunexus.org",
                hashed_password=get_password_hash("password123"),
                role="student"
            )
            db.add(sample_user)
            db.flush()
            sample_profile = Profile(
                user_id=sample_user.id,
                full_name="Aarav Mehta",
                avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=aarav",
                bio="Building autonomous robotics and machine learning models for real-world navigation.",
                country="India",
                city="Delhi",
                school="Delhi Public School",
                grade="Grade 12",
                goals="Win International Robotics Olympiad and launch an open-source AI platform."
            )
            db.add(sample_profile)

        db.commit()
    except Exception as e:
        print(f"[Startup] Error seeding initial data: {e}")
        db.rollback()
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "Edu Nexus V1 API",
        "docs": "/docs"
    }
