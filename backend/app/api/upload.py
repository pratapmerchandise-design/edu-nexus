from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import uuid
import os
import shutil

from backend.app.database import get_db
from backend.app.models import UserMembership
from backend.app.auth.security import SECRET_KEY, ALGORITHM
from backend.app import membership_config as mconfig

router = APIRouter(prefix="/upload", tags=["Upload"])

# Resolve the same uploads directory the static file server uses (see main.py).
# This keeps write-path and read-path identical regardless of the process CWD.
_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
UPLOAD_DIR = os.path.join(_ROOT_DIR, "backend", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed media types for a social platform (images, audio voice notes, video, generic)
ALLOWED_EXT = {
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.svg',
    '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm', '.mp4', '.mov', '.mkv', '.avi', '.m4v',
    '.pdf', '.txt', '.doc', '.docx', '.pptx', '.zip',
}


def _optional_user_tier(db: Session, authorization: str | None) -> str | None:
    """Best-effort tier detection from the bearer token (never fails the request)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        return None
    m = db.query(UserMembership).filter(
        UserMembership.user_id == user_id,
        UserMembership.status == 'active'
    ).order_by(UserMembership.expires_at.desc()).first()
    return m.tier if m else None


@router.post("")
async def upload_file(file: UploadFile = File(...), request: Request = None, db: Session = Depends(get_db)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' is not allowed.")

    # Paid members get a larger monthly upload allowance
    tier = _optional_user_tier(db, request.headers.get("Authorization") if request else None)
    max_bytes = mconfig.tier_upload_bytes(tier)

    # Read into memory to enforce size limit before writing to disk
    contents = await file.read()
    if len(contents) > max_bytes:
        limit_mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File too large (max {limit_mb} MB for your plan).")

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    # Build an absolute, environment-aware URL so uploads work in production
    base = str(request.base_url).rstrip('/') if request else "http://localhost:8000"
    url = f"{base}/uploads/{unique_filename}"
    return {"url": url, "name": file.filename, "size": len(contents)}

