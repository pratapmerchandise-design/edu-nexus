from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User, Profile, Follow, Interest, Skill, Notification, Conversation, ConversationMember
from backend.app.schemas import ProfileUpdate
from backend.app.auth.security import get_current_user, get_current_user_optional
from backend.app.models import Post
from backend.app.utils import format_user_out

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/public/{username}")
def get_public_profile(username: str, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_optional)):
    """Shareable public profile preview. Social actions remain authenticated-only."""
    target = db.query(User).filter(User.username == username.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    profile = format_user_out(target, current_user.id if current_user else None, db)
    posts = db.query(Post).filter(Post.author_id == target.id, Post.is_deleted == False, Post.audience == 'public').order_by(Post.created_at.desc()).limit(12).all()
    return {"profile": profile, "posts": [{"id": p.id, "content": p.content, "title": p.title, "image_url": p.image_url, "created_at": p.created_at, "post_type": p.post_type} for p in posts]}

@router.get("/follow-requests/pending")
def get_pending_follow_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requests = db.query(Follow).filter(
        Follow.followed_id == current_user.id,
        Follow.status == 'pending'
    ).order_by(Follow.created_at.desc()).all()

    requester_ids = [r.follower_id for r in requests]
    if not requester_ids:
        return []

    users = db.query(User).filter(User.id.in_(requester_ids)).all()
    user_map = {u.id: u for u in users}
    return [format_user_out(user_map[rid], current_user.id, db) for rid in requester_ids if rid in user_map]

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
        clean_school = data.school.strip() if data.school else ""
        profile.school = clean_school or None
        from backend.app.models import SchoolMember
        from backend.app.api.schools import find_or_create_school, sync_school_memberships_for_school
        
        # Remove existing membership
        db.query(SchoolMember).filter(SchoolMember.user_id == current_user.id).delete()
        
        if clean_school:
            school_obj = find_or_create_school(db, clean_school)
            if school_obj:
                profile.school = school_obj.name
                school_member = SchoolMember(
                    school_id=school_obj.id,
                    user_id=current_user.id,
                    role='student'
                )
                db.add(school_member)
                sync_school_memberships_for_school(db, school_obj)
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

@router.get("/{username}/followers")
def get_user_followers(username: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    records = db.query(Follow).filter(
        Follow.followed_id == target_user.id,
        Follow.status == 'accepted'
    ).order_by(Follow.created_at.desc()).all()

    follower_ids = [r.follower_id for r in records]
    if not follower_ids:
        return []

    users = db.query(User).filter(User.id.in_(follower_ids)).all()
    user_map = {u.id: u for u in users}
    return [format_user_out(user_map[fid], current_user.id, db) for fid in follower_ids if fid in user_map]

@router.get("/{username}/following")
def get_user_following(username: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    records = db.query(Follow).filter(
        Follow.follower_id == target_user.id,
        Follow.status == 'accepted'
    ).order_by(Follow.created_at.desc()).all()

    following_ids = [r.followed_id for r in records]
    if not following_ids:
        return []

    users = db.query(User).filter(User.id.in_(following_ids)).all()
    user_map = {u.id: u for u in users}
    return [format_user_out(user_map[fid], current_user.id, db) for fid in following_ids if fid in user_map]

@router.post("/{username}/follow")
def follow_user(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")

    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == target_user.id
    ).first()

    if existing:
        if existing.status == 'accepted':
            return {"message": "Already following", "is_following": True, "follow_status": "accepted"}
        else:
            return {"message": "Follow request already sent", "is_following": False, "follow_status": "pending"}

    # Create follow request with pending status
    follow_record = Follow(follower_id=current_user.id, followed_id=target_user.id, status='pending')
    db.add(follow_record)

    # Notification
    sender_name = current_user.profile.full_name if current_user.profile and current_user.profile.full_name else current_user.username
    notif = Notification(
        recipient_id=target_user.id,
        sender_id=current_user.id,
        type="follow_request",
        title="Follow Request",
        body=f"{sender_name} sent you a follow request.",
        link=f"/app/profile/{current_user.username}"
    )
    db.add(notif)
    db.commit()

    return {"message": "Follow request sent", "is_following": False, "follow_status": "pending"}

@router.delete("/{username}/follow")
def unfollow_user(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == target_user.id
    ).first()
    if existing:
        db.delete(existing)
        # Delete pending follow_request notification if any
        db.query(Notification).filter(
            Notification.recipient_id == target_user.id,
            Notification.sender_id == current_user.id,
            Notification.type.in_(["follow", "follow_request"])
        ).delete(synchronize_session=False)
        db.commit()

    return {"message": "Unfollowed or request cancelled successfully", "is_following": False, "follow_status": "none"}

@router.post("/{username}/accept-follow")
def accept_follow_request(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requester = db.query(User).filter(User.username == username.lower()).first()
    if not requester:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Delete incoming follow_request notification so it is removed from notifications
    db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.sender_id == requester.id,
        Notification.type == "follow_request"
    ).delete(synchronize_session=False)

    req = db.query(Follow).filter(
        Follow.follower_id == requester.id,
        Follow.followed_id == current_user.id,
        Follow.status == 'pending'
    ).first()

    if not req:
        # Check if already accepted
        already = db.query(Follow).filter(
            Follow.follower_id == requester.id,
            Follow.followed_id == current_user.id,
            Follow.status == 'accepted'
        ).first()
        db.commit()
        if already:
            return {"message": "Already following", "success": True, "follow_status": "accepted"}
        return {"message": "Follow request already handled", "success": True, "follow_status": "none"}

    req.status = 'accepted'

    # Notify the requester that their request was accepted
    sender_name = current_user.profile.full_name if current_user.profile and current_user.profile.full_name else current_user.username
    notif = Notification(
        recipient_id=requester.id,
        sender_id=current_user.id,
        type="follow_accepted",
        title="Follow Request Accepted",
        body=f"{sender_name} accepted your follow request.",
        link=f"/app/profile/{current_user.username}"
    )
    db.add(notif)

    # If now mutual followers, auto-accept any pending direct message conversation
    reverse_follow = db.query(Follow).filter(
        Follow.follower_id == current_user.id,
        Follow.followed_id == requester.id,
        Follow.status == 'accepted'
    ).first()
    if reverse_follow:
        my_conv_ids = [m.conversation_id for m in db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()]
        target_conv_ids = [m.conversation_id for m in db.query(ConversationMember).filter(ConversationMember.user_id == requester.id).all()]
        common_ids = set(my_conv_ids).intersection(set(target_conv_ids))
        for cid in common_ids:
            conv = db.query(Conversation).filter(Conversation.id == cid, Conversation.is_group == False).first()
            if conv and conv.status == 'pending':
                conv.status = 'accepted'

    db.commit()
    return {"message": "Follow request accepted", "success": True, "follow_status": "accepted"}

@router.post("/{username}/reject-follow")
def reject_follow_request(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requester = db.query(User).filter(User.username == username.lower()).first()
    if not requester:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    req = db.query(Follow).filter(
        Follow.follower_id == requester.id,
        Follow.followed_id == current_user.id,
        Follow.status == 'pending'
    ).first()
    if req:
        db.delete(req)

    # Delete incoming follow_request notification so it is removed from notifications
    db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.sender_id == requester.id,
        Notification.type == "follow_request"
    ).delete(synchronize_session=False)

    db.commit()
    return {"message": "Follow request rejected", "success": True}

@router.delete("/{username}/remove-follower")
def remove_follower(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.username == username.lower()).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(Follow).filter(
        Follow.follower_id == target_user.id,
        Follow.followed_id == current_user.id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()

    return {"message": "Follower removed successfully", "success": True}

@router.delete("/me")
def delete_my_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}
