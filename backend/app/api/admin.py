from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
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
