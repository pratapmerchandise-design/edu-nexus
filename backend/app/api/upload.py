from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
import os
import shutil

router = APIRouter(prefix="/upload", tags=["Upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    url = f"http://localhost:8000/uploads/{unique_filename}"
    return {"url": url}
