from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User, Profile, Follow, Interest, Skill, Notification
from backend.app.schemas import ProfileUpdate
from backend.app.auth.security import get_current_user
from backend.app.utils import format_user_out

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/{username}")
def get_user_profile(username: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return format_user_out(target_user, current_user.id, db)

@router.patch("/me/profile")
def update_profile(data: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = current_user.profile
    if not profile:
        profile = Profile(user_id=current_user.id, full_name=current_user.username)
        db.add(profile)

    if data.full_name is not None:
        profile.full_name = data.full_name
    if data.avatar_url is not None:
        profile.avatar_url = data.avatar_url
    if data.bio is not None:
        profile.bio = data.bio
    if data.country is not None:
        profile.country = data.country
    if data.city is not None:
        profile.city = data.city
    if data.school is not None:
        profile.school = data.school
    if data.grade is not None:
        profile.grade = data.grade
    if data.goals is not None:
        profile.goals = data.goals
    if data.open_to_collab is not None:
        profile.open_to_collab = data.open_to_collab
    if data.show_email is not None:
        profile.show_email = data.show_email
    if data.show_phone is not None:
        profile.show_phone = data.show_phone
    if data.show_dob is not None:
        profile.show_dob = data.show_dob

    if data.interests is not None:
        current_user.interests.clear()
        for interest_name in data.interests:
            clean_name = interest_name.strip()
            if clean_name:
                obj = db.query(Interest).filter(Interest.name == clean_name).first()
                if not obj:
                    obj = Interest(name=clean_name)
                    db.add(obj)
                    db.flush()
                current_user.interests.append(obj)

    if data.skills is not None:
        current_user.skills.clear()
        for skill_name in data.skills:
            clean_name = skill_name.strip()
            if clean_name:
                obj = db.query(Skill).filter(Skill.name == clean_name).first()
                if not obj:
                    obj = Skill(name=clean_name)
                    db.add(obj)
                    db.flush()
                current_user.skills.append(obj)

    db.commit()
    db.refresh(current_user)
    return format_user_out(current_user, current_user.id, db)

@router.post("/{username}/follow")
def follow_user(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")

    existing = db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.followed_id == target_user.id).first()
    if not existing:
        follow_record = Follow(follower_id=current_user.id, followed_id=target_user.id)
        db.add(follow_record)

        # Notification
        notif = Notification(
            recipient_id=target_user.id,
            sender_id=current_user.id,
            type="follow",
            title="New Follower",
            body=f"{current_user.profile.full_name if current_user.profile else current_user.username} started following you.",
            link=f"/app/profile/{current_user.username}"
        )
        db.add(notif)
        db.commit()

    return {"message": "Followed successfully", "is_following": True}

@router.delete("/{username}/follow")
def unfollow_user(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(Follow).filter(Follow.follower_id == current_user.id, Follow.followed_id == target_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()

    return {"message": "Unfollowed successfully", "is_following": False}
