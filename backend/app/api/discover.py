from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.app.database import get_db
from backend.app.models import User, Profile, Skill, Interest, Post, Opportunity
from backend.app.schemas import UserOut, PostOut, OpportunityOut
from backend.app.auth.security import get_current_user
from backend.app.utils import format_user_out
from backend.app.api.posts import format_post_out

router = APIRouter(prefix="/discover", tags=["Discover"])

@router.get("/students")
def discover_students(
    query: Optional[str] = None,
    skill: Optional[str] = None,
    interest: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users_query = db.query(User).join(Profile, User.id == Profile.user_id).filter(User.is_banned == False)

    if query:
        q_clean = f"%{query.strip().lower()}%"
        users_query = users_query.filter(
            (User.username.like(q_clean)) |
            (Profile.full_name.like(q_clean)) |
            (Profile.bio.like(q_clean)) |
            (Profile.school.like(q_clean)) |
            (Profile.city.like(q_clean)) |
            (User.skills.any(Skill.name.ilike(q_clean))) |
            (User.interests.any(Interest.name.ilike(q_clean)))
        )

    if location:
        loc_clean = f"%{location.strip().lower()}%"
        users_query = users_query.filter(
            (Profile.country.like(loc_clean)) |
            (Profile.city.like(loc_clean))
        )

    if skill:
        skill_clean = skill.strip().lower()
        users_query = users_query.filter(User.skills.any(Skill.name.ilike(skill_clean)))

    if interest:
        interest_clean = interest.strip().lower()
        users_query = users_query.filter(User.interests.any(Interest.name.ilike(interest_clean)))

    matched_users = users_query.order_by(User.username.asc()).limit(50).all()
    return [format_user_out(u, current_user.id, db) for u in matched_users]

@router.get("/posts")
def discover_posts(
    query: Optional[str] = None,
    post_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    posts_query = db.query(Post).filter(Post.is_deleted == False)

    if query:
        q_clean = f"%{query.strip().lower()}%"
        posts_query = posts_query.filter(
            (Post.title.like(q_clean)) |
            (Post.content.like(q_clean))
        )

    if post_type:
        posts_query = posts_query.filter(Post.post_type == post_type.upper())

    matched_posts = posts_query.order_by(Post.created_at.desc()).limit(30).all()
    return [format_post_out(p, current_user.id, db) for p in matched_posts]
