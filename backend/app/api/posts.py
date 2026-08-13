from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import Post, PostImage, PollOption, PollVote, Like, Comment, SavedPost, User, Notification
from backend.app.schemas import PostCreate, PostOut, CommentCreate, CommentOut
from backend.app.auth.security import get_current_user

router = APIRouter(prefix="/posts", tags=["Posts"])

def format_post_out(post: Post, current_user_id: int, db: Session) -> dict:
    author = post.author
    author_name = author.profile.full_name if author and author.profile else author.username
    author_avatar = author.profile.avatar_url if author and author.profile else None
    author_school = author.profile.school if author and author.profile else None

    # Images
    images = [img.image_url for img in post.images]

    # Poll options
    poll_options_data = []
    for opt in post.poll_options:
        votes_cnt = db.query(PollVote).filter(PollVote.poll_option_id == opt.id).count()
        user_voted = db.query(PollVote).filter(PollVote.poll_option_id == opt.id, PollVote.user_id == current_user_id).first() is not None
        poll_options_data.append({
            "id": opt.id,
            "option_text": opt.option_text,
            "votes_count": votes_cnt,
            "user_voted": user_voted
        })

    # Counts
    likes_cnt = db.query(Like).filter(Like.post_id == post.id).count()
    comments_cnt = db.query(Comment).filter(Comment.post_id == post.id, Comment.is_deleted == False).count()

    # User interactions
    user_liked = db.query(Like).filter(Like.post_id == post.id, Like.user_id == current_user_id).first() is not None
    user_saved = db.query(SavedPost).filter(SavedPost.post_id == post.id, SavedPost.user_id == current_user_id).first() is not None

    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_username": author.username,
        "author_name": author_name,
        "author_avatar": author_avatar,
        "author_school": author_school,
        "title": post.title,
        "content": post.content,
        "post_type": post.post_type,
        "reply_privacy": post.reply_privacy,
        "tags": post.tags,
        "location": getattr(post, 'location', None),
        "images": images,
        "poll_options": poll_options_data,
        "likes_count": likes_cnt,
        "comments_count": comments_cnt,
        "user_liked": user_liked,
        "user_saved": user_saved,
        "created_at": post.created_at
    }

@router.get("", response_model=List[PostOut])
def get_feed(
    post_type: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Post).filter(Post.is_deleted == False)
    if post_type:
        query = query.filter(Post.post_type == post_type.upper())
    if user_id:
        query = query.filter(Post.author_id == user_id)

    posts = query.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
    return [format_post_out(p, current_user.id, db) for p in posts]

@router.post("", response_model=PostOut)
def create_post(
    data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_types = ['HELP', 'WIN', 'IDEA', 'COLLAB', 'POLL']
    p_type = data.post_type.upper() if data.post_type else 'COLLAB'
    if p_type not in valid_types:
        p_type = 'COLLAB'

    new_post = Post(
        author_id=current_user.id,
        title=data.title,
        content=data.content,
        post_type=p_type,
        reply_privacy=data.reply_privacy,
        tags=data.tags,
        location=data.location
    )
    db.add(new_post)
    db.flush()

    if data.image_url:
        img = PostImage(post_id=new_post.id, image_url=data.image_url)
        db.add(img)

    if p_type == 'POLL' and data.poll_options:
        for opt_text in data.poll_options:
            if opt_text.strip():
                opt = PollOption(post_id=new_post.id, option_text=opt_text.strip())
                db.add(opt)

    db.commit()
    db.refresh(new_post)
    return format_post_out(new_post, current_user.id, db)

@router.post("/{post_id}/like")
def toggle_like(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False, "likes_count": db.query(Like).filter(Like.post_id == post_id).count()}
    else:
        like = Like(post_id=post_id, user_id=current_user.id)
        db.add(like)

        # Notify post author if not self
        if post.author_id != current_user.id:
            notif = Notification(
                recipient_id=post.author_id,
                sender_id=current_user.id,
                type="like",
                title="Post Liked",
                body=f"{current_user.profile.full_name if current_user.profile else current_user.username} liked your post.",
                link=f"/app/feed?post={post.id}"
            )
            db.add(notif)

        db.commit()
        return {"liked": True, "likes_count": db.query(Like).filter(Like.post_id == post_id).count()}

@router.post("/{post_id}/save")
def toggle_save(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    existing = db.query(SavedPost).filter(SavedPost.post_id == post_id, SavedPost.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"saved": False}
    else:
        saved = SavedPost(post_id=post_id, user_id=current_user.id)
        db.add(saved)
        db.commit()
        return {"saved": True}

@router.post("/{post_id}/poll/vote/{option_id}")
def vote_poll(post_id: int, option_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    option = db.query(PollOption).filter(PollOption.id == option_id, PollOption.post_id == post_id).first()
    if not option:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poll option not found")

    # Check if user already voted on any option in this post
    all_post_option_ids = [opt.id for opt in db.query(PollOption).filter(PollOption.post_id == post_id).all()]
    existing_vote = db.query(PollVote).filter(
        PollVote.poll_option_id.in_(all_post_option_ids),
        PollVote.user_id == current_user.id
    ).first()

    if existing_vote:
        existing_vote.poll_option_id = option_id
    else:
        new_vote = PollVote(poll_option_id=option_id, user_id=current_user.id)
        db.add(new_vote)

    db.commit()
    return {"message": "Vote recorded"}

@router.get("/{post_id}/comments", response_model=List[CommentOut])
def get_comments(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    all_comments = db.query(Comment).filter(
        Comment.post_id == post_id,
        Comment.is_deleted == False
    ).order_by(Comment.created_at.asc()).all()

    # Map nested replies
    comment_map = {}
    root_comments = []

    for c in all_comments:
        author = c.author
        c_dict = {
            "id": c.id,
            "post_id": c.post_id,
            "author_id": c.author_id,
            "author_username": author.username if author else "unknown",
            "author_name": author.profile.full_name if author and author.profile else (author.username if author else "Unknown"),
            "author_avatar": author.profile.avatar_url if author and author.profile else None,
            "parent_id": c.parent_id,
            "content": c.content,
            "created_at": c.created_at,
            "replies": []
        }
        comment_map[c.id] = c_dict

    for c in all_comments:
        if c.parent_id and c.parent_id in comment_map:
            comment_map[c.parent_id]["replies"].append(comment_map[c.id])
        else:
            root_comments.append(comment_map[c.id])

    return root_comments

@router.post("/{post_id}/comments")
def add_comment(post_id: int, data: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    new_comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        parent_id=data.parent_id,
        content=data.content
    )
    db.add(new_comment)

    # Notify author / parent comment author
    notify_target_id = post.author_id
    if data.parent_id:
        parent = db.query(Comment).filter(Comment.id == data.parent_id).first()
        if parent:
            notify_target_id = parent.author_id

    if notify_target_id != current_user.id:
        notif = Notification(
            recipient_id=notify_target_id,
            sender_id=current_user.id,
            type="comment" if not data.parent_id else "reply",
            title="New Comment" if not data.parent_id else "New Reply",
            body=f"{current_user.profile.full_name if current_user.profile else current_user.username} commented: '{data.content[:40]}...'",
            link=f"/app/feed?post={post_id}"
        )
        db.add(notif)

    db.commit()
    db.refresh(new_comment)
    return {"message": "Comment added successfully", "id": new_comment.id}
