import os
import sys

# Ensure root workspace directory is in python path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.database import engine, Base, SessionLocal, get_db
from backend.app.models import User, Profile, School, SchoolMember
from backend.app.auth.security import get_password_hash
from fastapi.staticfiles import StaticFiles
from backend.app.api import auth, users, posts, discover, forums, opportunities, messages, notifications, admin, upload, schools, membership, gifs, stickers

# Create tables automatically
Base.metadata.create_all(bind=engine)

try:
    from backend.migrate_follow_status import run as run_follow_migration
    run_follow_migration()
except Exception as e:
    print(f"[Startup] Follow migration note: {e}")

try:
    from backend.migrate_reactions import run as run_reactions_migration
    run_reactions_migration()
except Exception as e:
    print(f"[Startup] Reactions migration note: {e}")

try:
    from backend.migrate_school_members import run_migration as run_school_members_migration
    run_school_members_migration()
except Exception as e:
    print(f"[Startup] School members migration note: {e}")

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
    "http://127.0.0.1:3000",
]

import mimetypes
from fastapi.responses import StreamingResponse, FileResponse, Response

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Accept-Ranges", "Content-Range", "Content-Length", "Content-Type"],
)

import time
from collections import defaultdict

# Rate limiter for auth endpoints: max 20 requests per minute per IP to prevent brute-force attacks
ip_auth_attempts = defaultdict(list)

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Rate Limiting on sensitive auth endpoints
    if request.url.path in ["/api/auth/login", "/api/auth/register", "/api/auth/forgot-password"]:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        attempts = [t for t in ip_auth_attempts[client_ip] if now - t < 60]
        ip_auth_attempts[client_ip] = attempts
        if len(attempts) >= 20:
            return Response(
                content='{"detail": "Rate limit exceeded. Please wait 1 minute before retrying."}',
                status_code=429,
                media_type="application/json"
            )
        ip_auth_attempts[client_ip].append(now)

    # 2. Process Request
    try:
        response = await call_next(request)
    except Exception as exc:
        # Surface the real error message to the client so the UI never shows
        # a generic "unexpected error" alert with no information.
        import traceback
        traceback.print_exc()
        return Response(
            content=f'{{"detail": "Server error: {type(exc).__name__}: {str(exc).replace(chr(34), chr(39))}"}}',
            status_code=500,
            media_type="application/json",
        )

    # 3. HTTP Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    return response

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
app.include_router(schools.router, prefix="/api/schools")
app.include_router(membership.router, prefix="/api/membership")
app.include_router(gifs.router, prefix="/api")
app.include_router(stickers.router, prefix="/api")

# Uploads directory with HTTP Range / Video Seeking support (HTTP 206 Partial Content)
UPLOAD_DIR = os.path.join(root_dir, "backend", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/uploads/{filename:path}")
async def serve_upload(filename: str, request: Request):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.abspath(file_path).startswith(os.path.abspath(UPLOAD_DIR)):
        raise HTTPException(status_code=403, detail="Forbidden")
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    file_size = os.path.getsize(file_path)
    content_type, _ = mimetypes.guess_type(file_path)
    content_type = content_type or "application/octet-stream"

    range_header = request.headers.get("range") or request.headers.get("Range")
    if not range_header:
        return FileResponse(
            file_path,
            media_type=content_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            }
        )

    # Parse Range: bytes=START-END
    try:
        bytes_unit, byte_range = range_header.strip().split("=")
        if bytes_unit.strip().lower() != "bytes":
            return FileResponse(file_path, media_type=content_type, headers={"Accept-Ranges": "bytes"})
        
        range_parts = byte_range.split("-")
        start = int(range_parts[0]) if range_parts[0].strip() else 0
        end = int(range_parts[1]) if len(range_parts) > 1 and range_parts[1].strip() else file_size - 1

        if start >= file_size or end >= file_size or start > end:
            return Response(
                status_code=416,
                headers={"Content-Range": f"bytes */{file_size}"}
            )

        chunk_size = end - start + 1

        def iterfile():
            with open(file_path, mode="rb") as f:
                f.seek(start)
                bytes_left = chunk_size
                while bytes_left > 0:
                    read_size = min(1024 * 1024, bytes_left)  # 1 MB chunks
                    data = f.read(read_size)
                    if not data:
                        break
                    bytes_left -= len(data)
                    yield data

        return StreamingResponse(
            iterfile(),
            status_code=206,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
                "Content-Type": content_type,
            },
        )
    except Exception:
        return FileResponse(file_path, media_type=content_type, headers={"Accept-Ranges": "bytes"})

@app.on_event("startup")
def startup_event():
    # 1. Apply any pending additive migrations. These are idempotent — each
    #    checks whether the column already exists and bails early. This means
    #    we can deploy schema changes safely without an out-of-band step.
    try:
        from backend.migrate_school_columns import run as _run_school_cols
        _run_school_cols()
    except Exception as e:
        print(f"[Startup] school columns migration skipped: {e}")
    try:
        from backend.migrate_post_audience_any import run as _run_post_audience
        _run_post_audience()
    except Exception as e:
        print(f"[Startup] post audience migration skipped: {e}")

    # 2. Ensure the verified campus directory is populated. The seed file is
    #    bundled with the repo; if it exists and the table is mostly empty
    #    (e.g. fresh DB), bulk-load it. This is a no-op when schools already
    #    exist, so it's safe to run on every boot.
    try:
        # Resolve the project root from this file's location. main.py lives at
        # <root>/backend/app/main.py, so two dirname() calls land on <root>.
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        seed_path = os.path.join(project_root, "backend", "seeds", "delhi_schools.json")
        if os.path.exists(seed_path):
            from backend.scripts.seed_schools import seed_from_file
            seed_from_file(seed_path)
            print(f"[Startup] Seeded schools from {seed_path}")
    except Exception as e:
        print(f"[Startup] school seed skipped: {e}")

    # 3. Ensure primary administrator exists with high-entropy production credentials
    db = SessionLocal()
    try:
        admin_pass = os.getenv("ADMIN_INITIAL_PASSWORD", "SarthakVermaEdu12@")
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="edunexus.infodesk@gmail.com",
                hashed_password=get_password_hash(admin_pass),
                role="admin",
                is_email_verified=True
            )
            db.add(admin_user)
            db.flush()
            admin_profile = Profile(
                user_id=admin_user.id,
                full_name="EduNexus Platform Administrator",
                avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
                bio="Official platform security and campus administration."
            )
            db.add(admin_profile)
        else:
            admin_user.email = "edunexus.infodesk@gmail.com"
            admin_user.hashed_password = get_password_hash(admin_pass)
            admin_user.is_email_verified = True

        db.commit()
    except Exception as e:
        print(f"[Startup] Error verifying administrator account: {e}")
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

@app.post("/api/newsletter/subscribe")
def subscribe_newsletter(data: dict, db: Session = Depends(get_db)):
    email = (data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    from backend.app.models import NewsletterSubscriber
    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email).first()
    if not existing:
        sub = NewsletterSubscriber(email=email)
        db.add(sub)
        db.commit()

    return {"success": True, "message": "Successfully subscribed to student opportunity alerts!"}

@app.post("/api/contact")
def submit_contact(data: dict, db: Session = Depends(get_db)):
    name = (data.get("name") or "").strip()
    email_addr = (data.get("email") or "").strip().lower()
    message = (data.get("message") or "").strip()

    if not name or not email_addr or not message:
        raise HTTPException(status_code=400, detail="Name, email, and message are required.")

    from backend.app.models import ContactMessage
    msg = ContactMessage(name=name, email=email_addr, message=message)
    db.add(msg)
    db.commit()

    # Forward inquiry to the official EduNexus inbox
    try:
        from backend.app import email as mail
        mail.send_email(
            "edunexus.infodesk@gmail.com",
            f"New Contact Inquiry from {name}",
            mail._html_shell(
                f"Support Inquiry: {name}",
                f"<p><strong>Sender:</strong> {name} (&lt;{email_addr}&gt;)</p><p><strong>Message:</strong></p><blockquote style='border-left:3px solid #22e079;padding-left:12px;margin:12px 0;'>{message}</blockquote>"
            )
        )
    except Exception as err:
        print(f"[Contact] Notification error: {err}")

    return {"success": True, "message": "Message sent! Our support team will get back to you shortly."}
