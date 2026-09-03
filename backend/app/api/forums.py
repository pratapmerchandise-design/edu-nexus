from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import ForumCategory, ForumThread, ForumReply, ForumUpvote, ForumDownvote, User, Notification
from backend.app.schemas import ForumCategoryOut, ForumThreadCreate, ForumThreadOut, ForumReplyCreate, ForumReplyOut
from backend.app.auth.security import get_current_user
from backend.app.utils import _membership_info

router = APIRouter(prefix="/forums", tags=["Forums"])

DEFAULT_CATEGORIES = [
    {"name": "Mathematics", "slug": "mathematics", "description": "Equations, proofs, calculus, linear algebra and competitions."},
    {"name": "Physics", "slug": "physics", "description": "Mechanics, quantum, astrophysics, and physics olympiads."},
    {"name": "Chemistry", "slug": "chemistry", "description": "Organic, physical, inorganic chemistry and experiments."},
    {"name": "Biology", "slug": "biology", "description": "Genetics, molecular biology, medicine, and research."},
    {"name": "Computer Science", "slug": "computer-science", "description": "Algorithms, web development, AI, software systems."},
    {"name": "Research", "slug": "research", "description": "Paper writing, journal submissions, research projects."},
    {"name": "Competitions", "slug": "competitions", "description": "Hackathons, Olympiads, ISEF, debate, science fairs."},
    {"name": "College Admissions", "slug": "college-admissions", "description": "Applications, essays, standardized tests, university advice."},
    {"name": "General", "slug": "general", "description": "Student life, productivity, study tips, and free discussion."}
]

def seed_categories_if_empty(db: Session):
    if db.query(ForumCategory).count() == 0:
        for cat in DEFAULT_CATEGORIES:
            c_obj = ForumCategory(name=cat["name"], slug=cat["slug"], description=cat["description"])
            db.add(c_obj)
        db.commit()

def format_thread_out(t: ForumThread, current_user_id: int, db: Session) -> dict:
    author = t.author
    if t.is_anonymous:
        author_username = "anonymous"
        author_name = "Anonymous Student"
        author_avatar = "https://api.dicebear.com/7.x/identicon/svg?seed=anonymous"
    else:
        author_username = author.username
        author_name = author.profile.full_name if author and author.profile else author.username
        author_avatar = author.profile.avatar_url if author and author.profile else None

    upvotes_cnt = db.query(ForumUpvote).filter(ForumUpvote.thread_id == t.id).count()
    downvotes_cnt = db.query(ForumDownvote).filter(ForumDownvote.thread_id == t.id).count()
    replies_cnt = db.query(ForumReply).filter(ForumReply.thread_id == t.id, ForumReply.is_deleted == False).count()
    user_upvoted = db.query(ForumUpvote).filter(ForumUpvote.thread_id == t.id, ForumUpvote.user_id == current_user_id).first() is not None
    user_downvoted = db.query(ForumDownvote).filter(ForumDownvote.thread_id == t.id, ForumDownvote.user_id == current_user_id).first() is not None

    return {
        "id": t.id,
        "category_id": t.category_id,
        "category_name": t.category.name if t.category else "General",
        "author_id": t.author_id if not t.is_anonymous else 0,
        "author_username": author_username,
        "author_name": author_name,
        "author_avatar": author_avatar,
        "title": t.title,
        "content": t.content,
        "is_anonymous": t.is_anonymous,
        "upvotes_count": upvotes_cnt,
        "downvotes_count": downvotes_cnt,
        "replies_count": replies_cnt,
        "user_upvoted": user_upvoted,
        "user_downvoted": user_downvoted,
        "author_membership": _membership_info(author, db) if not t.is_anonymous else None,
        "created_at": t.created_at
    }

@router.get("/categories", response_model=List[ForumCategoryOut])
def get_categories(db: Session = Depends(get_db)):
    seed_categories_if_empty(db)
    return db.query(ForumCategory).all()

@router.get("/threads", response_model=List[ForumThreadOut])
def get_threads(
    category_id: Optional[int] = None,
    query: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    seed_categories_if_empty(db)
    threads_q = db.query(ForumThread).filter(ForumThread.is_deleted == False)

    if category_id:
        threads_q = threads_q.filter(ForumThread.category_id == category_id)

    if query:
        q_clean = f"%{query.strip().lower()}%"
        threads_q = threads_q.filter(
            (ForumThread.title.like(q_clean)) |
            (ForumThread.content.like(q_clean))
        )

    threads = threads_q.order_by(ForumThread.created_at.desc()).all()
    return [format_thread_out(t, current_user.id, db) for t in threads]

@router.post("/threads", response_model=ForumThreadOut)
def create_thread(
    data: ForumThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = db.query(ForumCategory).filter(ForumCategory.id == data.category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    new_thread = ForumThread(
        category_id=data.category_id,
        author_id=current_user.id,
        title=data.title,
        content=data.content,
        is_anonymous=data.is_anonymous
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)
    return format_thread_out(new_thread, current_user.id, db)

@router.get("/threads/{thread_id}", response_model=ForumThreadOut)
def get_thread_detail(thread_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(ForumThread).filter(ForumThread.id == thread_id, ForumThread.is_deleted == False).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    return format_thread_out(t, current_user.id, db)

@router.post("/threads/{thread_id}/upvote")
def toggle_upvote(thread_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(ForumThread).filter(ForumThread.id == thread_id, ForumThread.is_deleted == False).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    existing_down = db.query(ForumDownvote).filter(ForumDownvote.thread_id == thread_id, ForumDownvote.user_id == current_user.id).first()
    if existing_down:
        db.delete(existing_down)

    existing_up = db.query(ForumUpvote).filter(ForumUpvote.thread_id == thread_id, ForumUpvote.user_id == current_user.id).first()
    if existing_up:
        db.delete(existing_up)
        upvoted = False
    else:
        upvote = ForumUpvote(thread_id=thread_id, user_id=current_user.id)
        db.add(upvote)
        upvoted = True
        
    db.commit()
    return {
        "upvoted": upvoted, 
        "upvotes_count": db.query(ForumUpvote).filter(ForumUpvote.thread_id == thread_id).count(),
        "downvoted": False,
        "downvotes_count": db.query(ForumDownvote).filter(ForumDownvote.thread_id == thread_id).count()
    }

@router.post("/threads/{thread_id}/downvote")
def toggle_downvote(thread_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(ForumThread).filter(ForumThread.id == thread_id, ForumThread.is_deleted == False).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    existing_up = db.query(ForumUpvote).filter(ForumUpvote.thread_id == thread_id, ForumUpvote.user_id == current_user.id).first()
    if existing_up:
        db.delete(existing_up)

    existing_down = db.query(ForumDownvote).filter(ForumDownvote.thread_id == thread_id, ForumDownvote.user_id == current_user.id).first()
    if existing_down:
        db.delete(existing_down)
        downvoted = False
    else:
        downvote = ForumDownvote(thread_id=thread_id, user_id=current_user.id)
        db.add(downvote)
        downvoted = True
        
    db.commit()
    return {
        "upvoted": False, 
        "upvotes_count": db.query(ForumUpvote).filter(ForumUpvote.thread_id == thread_id).count(),
        "downvoted": downvoted,
        "downvotes_count": db.query(ForumDownvote).filter(ForumDownvote.thread_id == thread_id).count()
    }

@router.get("/threads/{thread_id}/replies", response_model=List[ForumReplyOut])
def get_thread_replies(thread_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    replies = db.query(ForumReply).filter(
        ForumReply.thread_id == thread_id,
        ForumReply.is_deleted == False
    ).order_by(ForumReply.created_at.asc()).all()

    res = []
    for r in replies:
        author = r.author
        if r.is_anonymous:
            author_username = "anonymous"
            author_name = "Anonymous Student"
            author_avatar = "https://api.dicebear.com/7.x/identicon/svg?seed=anonymous"
        else:
            author_username = author.username
            author_name = author.profile.full_name if author and author.profile else author.username
            author_avatar = author.profile.avatar_url if author and author.profile else None

        res.append({
            "id": r.id,
            "thread_id": r.thread_id,
            "author_id": r.author_id if not r.is_anonymous else 0,
            "author_username": author_username,
            "author_name": author_name,
            "author_avatar": author_avatar,
            "content": r.content,
            "is_anonymous": r.is_anonymous,
            "created_at": r.created_at
        })
    return res

@router.post("/threads/{thread_id}/replies")
def add_thread_reply(thread_id: int, data: ForumReplyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(ForumThread).filter(ForumThread.id == thread_id, ForumThread.is_deleted == False).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    new_reply = ForumReply(
        thread_id=thread_id,
        author_id=current_user.id,
        content=data.content,
        is_anonymous=data.is_anonymous
    )
    db.add(new_reply)

    if t.author_id != current_user.id:
        notif = Notification(
            recipient_id=t.author_id,
            sender_id=current_user.id if not data.is_anonymous else None,
            type="reply",
            title="New Forum Reply",
            body=f"{'An anonymous student' if data.is_anonymous else (current_user.profile.full_name if current_user.profile else current_user.username)} replied to your thread '{t.title[:30]}...'",
            link=f"/app/forums?thread={thread_id}"
        )
        db.add(notif)

    db.commit()
    db.refresh(new_reply)
    return {"message": "Reply added successfully", "id": new_reply.id}
