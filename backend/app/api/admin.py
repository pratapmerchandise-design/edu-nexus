from datetime import datetime, timezone, timedelta
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from backend.app.database import get_db
from backend.app import models, schemas
from backend.app.models import User, Post, Comment, ForumThread, Opportunity, Report, Block
from backend.app.schemas import ReportCreate, ReportOut, UserOut
from backend.app.auth.security import get_current_user, get_current_admin
from backend.app.utils import format_user_out

router = APIRouter(tags=["Admin & Reporting"])

# Report Endpoint for all users
@router.post("/reports", response_model=ReportOut)
def create_report(
    data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_types = ['user', 'post', 'comment', 'forum_thread', 'message']
    if data.target_type not in valid_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid target type")

    valid_reasons = ['Spam', 'Harassment', 'Inappropriate content', 'Scam', 'Fake account', 'Other']
    if data.reason not in valid_reasons:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report reason")

    report = Report(
        reporter_id=current_user.id,
        target_type=data.target_type,
        target_id=data.target_id,
        reason=data.reason,
        details=data.details
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "reporter_username": current_user.username,
        "target_type": report.target_type,
        "target_id": report.target_id,
        "reason": report.reason,
        "details": report.details,
        "status": report.status,
        "created_at": report.created_at
    }

# Block Endpoint for users
@router.post("/users/{username}/block")
def block_user(username: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.username == username.lower()).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = db.query(Block).filter(Block.blocker_id == current_user.id, Block.blocked_id == target.id).first()
    if not existing:
        blk = Block(blocker_id=current_user.id, blocked_id=target.id)
        db.add(blk)
        db.commit()

    return {"message": f"Blocked user {username}"}

# --- ADMIN-ONLY PROTECTED ROUTES ---
@router.get("/admin/users", response_model=List[UserOut])
def admin_list_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [format_user_out(u, admin.id, db) for u in users]

@router.post("/admin/users/{user_id}/suspend")
def admin_suspend_user(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_suspended = not user.is_suspended
    db.commit()
    return {"message": f"User suspension state toggled to {user.is_suspended}"}

@router.post("/admin/users/{user_id}/ban")
def admin_ban_user(user_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_banned = not user.is_banned
    db.commit()
    return {"message": f"User ban state toggled to {user.is_banned}"}

@router.delete("/admin/posts/{post_id}")
def admin_delete_post(post_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post.is_deleted = True
    db.commit()
    return {"message": "Post deleted by admin"}

@router.delete("/admin/forums/threads/{thread_id}")
def admin_delete_thread(thread_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    t = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    t.is_deleted = True
    db.commit()
    return {"message": "Forum thread deleted by admin"}

@router.get("/admin/reports", response_model=List[ReportOut])
def admin_list_reports(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    res = []
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        res.append({
            "id": r.id,
            "reporter_id": r.reporter_id,
            "reporter_username": reporter.username if reporter else "unknown",
            "target_type": r.target_type,
            "target_id": r.target_id,
            "reason": r.reason,
            "details": r.details,
            "status": r.status,
            "created_at": r.created_at
        })
    return res

@router.patch("/admin/reports/{report_id}/resolve")
def admin_resolve_report(report_id: int, status_val: str = "resolved", admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    report.status = status_val
    db.commit()
    return {"message": f"Report status updated to {status_val}"}


# --- SCHOOL ADMIN INVITATIONS (PLATFORM ADMIN) ---

@router.get("/admin/school-invites", response_model=List[schemas.SchoolInvitationOut])
def list_school_invites(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    """List all sent school admin invitations, updating expired statuses."""
    now = datetime.now(timezone.utc)
    pending_invites = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.status == 'pending'
    ).all()
    changed = False
    for inv in pending_invites:
        if inv.expires_at and inv.expires_at < now:
            inv.status = 'expired'
            changed = True
    if changed:
        db.commit()

    invites = db.query(models.SchoolInvitation).order_by(models.SchoolInvitation.created_at.desc()).all()
    out = []
    for inv in invites:
        school = inv.school
        inviter = inv.invited_by
        out.append({
            "id": inv.id,
            "school_id": inv.school_id,
            "school_name": school.name if school else "Unknown School",
            "user_id": inv.user_id,
            "email": inv.email or (inv.user.email if inv.user else None),
            "token": inv.token,
            "expires_at": inv.expires_at,
            "invited_by_id": inv.invited_by_id,
            "invited_by_username": inviter.username if inviter else "admin",
            "role": inv.role or "admin",
            "status": inv.status,
            "created_at": inv.created_at
        })
    return out


@router.post("/admin/school-invites", response_model=schemas.SchoolInvitationOut)
def send_school_admin_invite(
    data: schemas.SchoolAdminInviteCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Platform admin sends a school admin invitation email with expiration timeline."""
    from backend.app.api.schools import find_or_create_school
    from backend.app import email as mail

    clean_email = data.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    # Locate or create the school
    school = None
    if data.school_id:
        school = db.query(models.School).filter(models.School.id == data.school_id).first()
    elif data.school_name and data.school_name.strip():
        school = find_or_create_school(db, data.school_name.strip())

    if not school:
        raise HTTPException(status_code=400, detail="Please select or provide a valid school.")

    days = data.expires_in_days if (data.expires_in_days and data.expires_in_days > 0) else 7
    expires_at = datetime.now(timezone.utc) + timedelta(days=days)
    token = secrets.token_urlsafe(32)

    # Check if existing invite for this school + email exists
    existing_invite = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.school_id == school.id,
        models.SchoolInvitation.email == clean_email
    ).first()

    existing_user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    if existing_invite:
        existing_invite.token = token
        existing_invite.expires_at = expires_at
        existing_invite.status = 'pending'
        existing_invite.invited_by_id = admin.id
        existing_invite.created_at = datetime.now(timezone.utc)
        if existing_user:
            existing_invite.user_id = existing_user.id
        inv = existing_invite
    else:
        inv = models.SchoolInvitation(
            school_id=school.id,
            user_id=existing_user.id if existing_user else None,
            email=clean_email,
            invited_by_id=admin.id,
            role='admin',
            status='pending',
            token=token,
            expires_at=expires_at
        )
        db.add(inv)

    try:
        db.commit()
    except Exception as commit_err:
        db.rollback()
        err_str = str(commit_err).lower()
        if "user_id" in err_str or "not null" in err_str:
            # Self-heal old table schema where user_id was NOT NULL
            try:
                from backend.migrate_school_admin_invites import run as run_migration
                run_migration()
                # Re-try with fresh query
                if existing_invite:
                    existing_invite = db.query(models.SchoolInvitation).filter(models.SchoolInvitation.id == existing_invite.id).first()
                    if existing_invite:
                        existing_invite.token = token
                        existing_invite.expires_at = expires_at
                        existing_invite.status = 'pending'
                        existing_invite.invited_by_id = admin.id
                        if existing_user:
                            existing_invite.user_id = existing_user.id
                        inv = existing_invite
                else:
                    inv = models.SchoolInvitation(
                        school_id=school.id,
                        user_id=existing_user.id if existing_user else None,
                        email=clean_email,
                        invited_by_id=admin.id,
                        role='admin',
                        status='pending',
                        token=token,
                        expires_at=expires_at
                    )
                    db.add(inv)
                db.commit()
            except Exception as retry_err:
                raise HTTPException(status_code=500, detail=f"Failed to save invitation: {retry_err}")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to save invitation: {commit_err}")

    db.refresh(inv)

    # Send invitation email via Gmail SMTP
    mail.send_school_admin_invite_email(clean_email, school.name, token, expires_at)

    return {
        "id": inv.id,
        "school_id": inv.school_id,
        "school_name": school.name,
        "user_id": inv.user_id,
        "email": inv.email,
        "token": inv.token,
        "expires_at": inv.expires_at,
        "invited_by_id": inv.invited_by_id,
        "invited_by_username": admin.username,
        "role": inv.role or "admin",
        "status": inv.status,
        "created_at": inv.created_at
    }


@router.post("/admin/school-invites/{invite_id}/resend", response_model=schemas.SchoolInvitationOut)
def resend_school_admin_invite(
    invite_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Resend school admin invitation with a fresh token and expiration timeline."""
    from backend.app import email as mail

    inv = db.query(models.SchoolInvitation).filter(models.SchoolInvitation.id == invite_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    inv.token = token
    inv.expires_at = expires_at
    inv.status = 'pending'
    inv.created_at = datetime.now(timezone.utc)
    inv.invited_by_id = admin.id
    db.commit()
    db.refresh(inv)

    target_email = inv.email or (inv.user.email if inv.user else "")
    if target_email:
        mail.send_school_admin_invite_email(target_email, inv.school.name if inv.school else "your school", token, expires_at)

    return {
        "id": inv.id,
        "school_id": inv.school_id,
        "school_name": inv.school.name if inv.school else "School",
        "user_id": inv.user_id,
        "email": inv.email,
        "token": inv.token,
        "expires_at": inv.expires_at,
        "invited_by_id": inv.invited_by_id,
        "invited_by_username": admin.username,
        "role": inv.role or "admin",
        "status": inv.status,
        "created_at": inv.created_at
    }


@router.delete("/admin/school-invites/{invite_id}")
def delete_school_admin_invite(
    invite_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete/cancel a school admin invitation."""
    inv = db.query(models.SchoolInvitation).filter(models.SchoolInvitation.id == invite_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")
    db.delete(inv)
    db.commit()
    return {"message": "Invitation cancelled and removed."}


@router.get("/admin/school-admins")
def list_active_school_admins(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all users who currently have the school admin role across all schools."""
    admin_members = db.query(models.SchoolMember).filter(
        models.SchoolMember.role == 'admin'
    ).all()
    out = []
    for m in admin_members:
        user = m.user
        school = m.school
        if user and school:
            out.append({
                "member_id": m.id,
                "school_id": school.id,
                "school_name": school.name,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.profile.full_name if user.profile and user.profile.full_name else user.username,
                "assigned_at": m.created_at.isoformat() if m.created_at else None,
                "joined_at": m.created_at.isoformat() if m.created_at else None
            })
    return out


@router.post("/admin/school-admins/{school_id}/{user_id}/revoke")
def revoke_school_admin_from_panel(
    school_id: int,
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Platform Admin revokes school admin privileges for a user."""
    member = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="School member not found")

    member.role = 'student'

    # Mark any invitations as revoked
    invites = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.school_id == school_id,
        models.SchoolInvitation.user_id == user_id
    ).all()
    for inv in invites:
        inv.status = 'revoked'

    db.commit()
    return {"message": "School admin role revoked successfully. User demoted to student."}


