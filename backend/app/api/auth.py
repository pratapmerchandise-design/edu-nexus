from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User, Profile, Interest, Skill
from backend.app.schemas import UserRegister, UserLogin, Token
from backend.app.auth.security import get_password_hash, verify_password, create_access_token, get_current_user
from backend.app.utils import format_user_out

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register_user(data: UserRegister, db: Session = Depends(get_db)):
    # Check email or username uniqueness
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered.")
    if db.query(User).filter(User.username == data.username.lower()).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is already taken.")

    # Create User
    new_user = User(
        username=data.username.lower(),
        email=data.email.lower(),
        hashed_password=get_password_hash(data.password),
        role="student"
    )
    db.add(new_user)
    db.flush()

    # Create Profile
    avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={new_user.username}"
    new_profile = Profile(
        user_id=new_user.id,
        full_name=data.name,
        avatar_url=avatar_url,
        country=data.country,
        city=data.city,
        school=data.school,
        grade=data.grade,
        dob=data.dob
    )
    db.add(new_profile)

    # Process interests
    if data.interests:
        for interest_name in data.interests:
            interest_name_clean = interest_name.strip()
            if interest_name_clean:
                interest_obj = db.query(Interest).filter(Interest.name == interest_name_clean).first()
                if not interest_obj:
                    interest_obj = Interest(name=interest_name_clean)
                    db.add(interest_obj)
                    db.flush()
                new_user.interests.append(interest_obj)

    # Process skills
    if data.skills:
        for skill_name in data.skills:
            skill_name_clean = skill_name.strip()
            if skill_name_clean:
                skill_obj = db.query(Skill).filter(Skill.name == skill_name_clean).first()
                if not skill_obj:
                    skill_obj = Skill(name=skill_name_clean)
                    db.add(skill_obj)
                    db.flush()
                new_user.skills.append(skill_obj)

    db.commit()

    # Create token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_out(new_user, new_user.id, db)
    }

@router.post("/login")
def login_user(data: UserLogin, db: Session = Depends(get_db)):
    query_str = data.email_or_username.lower().strip()
    user = db.query(User).filter(
        (User.email == query_str) | (User.username == query_str)
    ).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username/email or password.")

    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account banned due to moderation policy.")

    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_out(user, user.id, db)
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return format_user_out(current_user, current_user.id, db)

import random
import string
from datetime import datetime, timezone, timedelta
from backend.app.models import OTPVerification
from backend.app.schemas import OTPRequest, OTPVerify, ForgotPasswordRequest, ResetPasswordRequest
import uuid

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def send_mock_otp(contact: str, otp: str, is_reset: bool = False):
    print(f"\n=========================================")
    print(f"MOCK {'PASSWORD RESET' if is_reset else 'OTP'} DISPATCH")
    print(f"To: {contact}")
    print(f"Code/Token: {otp}")
    print(f"=========================================\n")

@router.post("/request-email-otp")
def request_email_otp(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.is_email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified")
    
    otp = generate_otp()
    existing = db.query(OTPVerification).filter(OTPVerification.user_id == current_user.id, OTPVerification.contact == current_user.email).first()
    if existing:
        db.delete(existing)
        
    verification = OTPVerification(
        user_id=current_user.id,
        contact=current_user.email,
        otp_code=otp,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(verification)
    db.commit()
    
    send_mock_otp(current_user.email, otp)
    return {"message": "OTP sent to email"}

@router.post("/verify-email-otp")
def verify_email_otp(data: OTPVerify, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.email != data.contact:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact mismatch")
        
    verification = db.query(OTPVerification).filter(
        OTPVerification.user_id == current_user.id, 
        OTPVerification.contact == current_user.email,
        OTPVerification.otp_code == data.otp_code
    ).first()
    
    if not verification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")
        
    if verification.expires_at < datetime.now(timezone.utc):
        db.delete(verification)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")
        
    current_user.is_email_verified = True
    db.delete(verification)
    db.commit()
    return {"message": "Email verified successfully"}

@router.post("/request-phone-otp")
def request_phone_otp(data: OTPRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.phone and not data.contact:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number required")
    
    phone_to_use = data.contact if data.contact else current_user.phone
    
    otp = generate_otp()
    existing = db.query(OTPVerification).filter(OTPVerification.user_id == current_user.id, OTPVerification.contact == phone_to_use).first()
    if existing:
        db.delete(existing)
        
    verification = OTPVerification(
        user_id=current_user.id,
        contact=phone_to_use,
        otp_code=otp,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(verification)
    current_user.phone = phone_to_use
    db.commit()
    
    send_mock_otp(phone_to_use, otp)
    return {"message": "OTP sent to phone"}

@router.post("/verify-phone-otp")
def verify_phone_otp(data: OTPVerify, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.phone != data.contact:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contact mismatch")
        
    verification = db.query(OTPVerification).filter(
        OTPVerification.user_id == current_user.id, 
        OTPVerification.contact == current_user.phone,
        OTPVerification.otp_code == data.otp_code
    ).first()
    
    if not verification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")
        
    if verification.expires_at < datetime.now(timezone.utc):
        db.delete(verification)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")
        
    current_user.is_phone_verified = True
    db.delete(verification)
    db.commit()
    return {"message": "Phone verified successfully"}

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if not user:
        # Don't reveal user doesn't exist
        return {"message": "If an account exists, a reset link has been sent"}
        
    token = str(uuid.uuid4())
    user.reset_password_token = token
    user.reset_password_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()
    
    send_mock_otp(user.email, token, is_reset=True)
    return {"message": "If an account exists, a reset link has been sent"}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_password_token == data.token).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
        
    if user.reset_password_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired")
        
    user.hashed_password = get_password_hash(data.new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    db.commit()
    
    return {"message": "Password reset successfully"}
