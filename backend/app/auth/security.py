import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "edunexus_v1_super_secret_jwt_key_2026_change_in_prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned due to moderation policy.")
    if user.is_suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account temporarily suspended.")
    
    # Update last_seen if older than 1 minute, but skip background polling requests
    is_background = request.headers.get("X-Background-Request") == "true"
    if not is_background:
        now = datetime.now(timezone.utc)
        if not user.last_seen or (now - user.last_seen.replace(tzinfo=timezone.utc)).total_seconds() > 10:
            user.last_seen = now
            db.commit()

    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
