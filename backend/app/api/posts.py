from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import get_db
from backend.app.models import Post, PostImage, PollOption, PollVote, Like, Comment, CommentLike, SavedPost, User, Notification, Follow, Interest, Skill, UserMembership, SchoolMember
from backend.app import membership_config as mconfig
from backend.app.schemas import PostCreate, PostOut, CommentCreate, CommentOut
from backend.app.auth.security import get_current_user
from backend.app.utils import _membership_info

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.get("/public/{post_id}")
def get_public_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id, Post.is_deleted == False, Post.audience == 'public').first()
    if not post: raise HTTPException(status_code=404, detail="Public post not found")
    return {"id": post.id, "title": post.title, "content": post.content, "image_url": post.image_url, "created_at": post.created_at, "author": {"username": post.author.username, "full_name": post.author.profile.full_name if post.author.profile else post.author.username, "avatar_url": post.author.profile.avatar_url if post.author.profile else None}}

def _mini_user(u: User) -> dict:
    full_name = None
    avatar = None
    if u and u.profile:
        full_name = u.profile.full_name
        avatar = u.profile.avatar_url
    return {
        "id": u.id if u else 0,
        "username": u.username if u else "unknown",
        "full_name": full_name,
        "avatar_url": avatar,
    }


def _social_proof(post: Post, current_user_id: int, following_ids: set, db: Session, limit: int = 2) -> dict:
    """Return up to `limit` users from the current user's follow list who
    liked or commented on this post. Excludes the current user and the post
    author so the label never includes "you" or the author.
    """
    exclude = {current_user_id, post.author_id}
    following_in_post = [uid for uid in following_ids if uid not in exclude]

    # Sample of who liked (most recent first)
    likers_q = db.query(Like).filter(Like.post_id == post.id)
    if following_in_post:
        likers_q = likers_q.filter(Like.user_id.in_(following_in_post))
    else:
        return {"liked_by_following": [], "commented_by_following": []}
    liker_user_ids = [l.user_id for l in likers_q.order_by(Like.created_at.desc()).limit(limit).all()]

    # Sample of who commented (most recent first)
    commenters_q = db.query(Comment).filter(
        Comment.post_id == post.id,
        Comment.is_deleted == False,
        Comment.author_id.in_(following_in_post),
        Comment.author_id != current_user_id,
        Comment.author_id != post.author_id,
    )
    commenter_user_ids = [c.author_id for c in commenters_q.order_by(Comment.created_at.desc()).limit(limit).all()]

    def _users(ids):
        if not ids:
            return []
        users = {u.id: u for u in db.query(User).filter(User.id.in_(ids)).all()}
        # Preserve order from ids list
        return [_mini_user(users[i]) for i in ids if i in users]

    return {
        "liked_by_following": _users(liker_user_ids),
        "commented_by_following": _users(commenter_user_ids),
    }


def format_post_out(post: Post, current_user_id: int, db: Session, following_ids: Optional[set] = None) -> dict:
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
        "author_membership": _membership_info(author, db),
        "audience": getattr(post, "audience", "public") or "public",
        "audience_community_id": getattr(post, "audience_community_id", None),
        # Follow-context: "X and Y liked this", "X and Y commented on this".
        # We pass following_ids if the caller already computed them (e.g. in
        # get_feed) to avoid a second query per post.
        **_social_proof(post, current_user_id, following_ids or set(), db),
        "created_at": post.created_at
    }

@router.get("", response_model=List[PostOut])
def get_feed(
    post_type: Optional[str] = None,
    user_id: Optional[int] = None,
    feed: Optional[str] = None,  # 'recommended' (interest-based) or None (chronological)
    school_only: bool = False,
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

    posts = query.order_by(Post.created_at.desc()).all()

    # Audience visibility: hide posts the current user isn't allowed to see.
    # Free posts are always public; member posts may be 'followers' or a school 'community'.
    following_ids = {
        f.followed_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    }
    user_school_ids = {
        m.school_id for m in db.query(SchoolMember).filter(SchoolMember.user_id == current_user.id).all()
    }

    def can_view(p: Post) -> bool:
        aud = getattr(p, 'audience', 'public') or 'public'
        if aud == 'public':
            return True
        if p.author_id == current_user.id:
            return True
        if aud == 'followers' and p.author_id in following_ids:
            return True
        if aud == 'community' and getattr(p, 'audience_community_id', None) in user_school_ids:
            return True
        return False

    posts = [p for p in posts if can_view(p)]
    if feed == 'following':
        posts = [p for p in posts if p.author_id in following_ids or p.author_id == current_user.id]
    if school_only:
        current_school = (getattr(getattr(current_user, 'profile', None), 'school', None) or '').strip().lower()
        if current_school:
            posts = [
                p for p in posts 
                if (getattr(getattr(p.author, 'profile', None), 'school', None) or '').strip().lower() == current_school
            ]
        else:
            posts = []
    if feed == 'trending':
        posts.sort(key=lambda p: (db.query(Like).filter(Like.post_id == p.id).count(), p.created_at), reverse=True)

    # Interest / network based ranking ("For You" feed)
    if feed == "recommended" and not user_id:
        user_interests = {i.name for i in current_user.interests}
        user_skills = {s.name for s in current_user.skills}
        following_ids = {
            f.followed_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()
        }

        # Preload membership boosts for all candidate authors (avoid N+1)
        author_ids = {p.author_id for p in posts}
        memberships = db.query(UserMembership).filter(
            UserMembership.user_id.in_(author_ids),
            UserMembership.status == 'active'
        ).all()
        boost_map = {m.user_id: mconfig.tier_boost(m.tier) for m in memberships}

        def score(p: Post) -> float:
            s = 0.0
            post_tags = set((p.tags or '').split(',')) if p.tags else set()
            author = p.author
            author_interests = {i.name for i in author.interests} if author else set()
            author_skills = {sk.name for sk in author.skills} if author else set()
            s += 3 * len(user_interests & post_tags)
            s += 3 * len(user_interests & author_interests)
            s += 2 * len(user_skills & author_skills)
            if p.author_id in following_ids:
                s += 5
            # Paid members get a reach multiplier so supporters are discovered more
            s = (s + 1) * boost_map.get(p.author_id, 1.0)
            return s

        ranked = sorted(posts, key=lambda p: (score(p), p.created_at), reverse=True)
        posts = ranked

    return [format_post_out(p, current_user.id, db, following_ids) for p in posts[offset:offset + limit]]

@router.post("", response_model=PostOut)
def create_post(
    data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_types = ['HELP', 'WIN', 'IDEA', 'COLLAB', 'POLL', 'CASUAL']
    p_type = data.post_type.upper() if data.post_type else 'CASUAL'
    if p_type not in valid_types:
        p_type = 'CASUAL'

    # Audiences: free users can only post publicly. Paid members may restrict to
    # 'followers' or a specific school 'community' they belong to.
    audience = (data.audience or 'public').lower()
    community_id = data.community_id
    if audience not in ('public', 'followers', 'community'):
        audience = 'public'

    from backend.app.quotas import active_tier
    is_paid = active_tier(db, current_user.id) is not None
    if audience != 'public' and not is_paid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only members can post to specific audiences (followers / community). Upgrade to choose who sees your post."
        )
    if audience == 'community':
        if not community_id:
            raise HTTPException(status_code=400, detail="community_id is required for community audience")
        member = db.query(SchoolMember).filter(
            SchoolMember.school_id == community_id,
            SchoolMember.user_id == current_user.id
        ).first()
        if not member:
            raise HTTPException(status_code=403, detail="You are not a member of that community")

    new_post = Post(
        author_id=current_user.id,
        title=data.title,
        content=data.content,
        post_type=p_type,
        reply_privacy=data.reply_privacy,
        tags=data.tags,
        location=data.location,
        audience=audience,
        audience_community_id=community_id if audience == 'community' else None
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
            "likes_count": db.query(CommentLike).filter(CommentLike.comment_id == c.id).count(),
            "user_liked": db.query(CommentLike).filter(CommentLike.comment_id == c.id, CommentLike.user_id == current_user.id).first() is not None,
            "author_membership": _membership_info(author, db),
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

    # Reply privacy enforcement
    if post.author_id != current_user.id:
        privacy_raw = (post.reply_privacy or "everyone").lower()
        privacy_set = {p.strip() for p in privacy_raw.split(",") if p.strip()}
        
        if "everyone" not in privacy_set:
            allowed = False
            
            # 1. School check
            if "school" in privacy_set or "my_school" in privacy_set:
                cur_school = (getattr(getattr(current_user, 'profile', None), 'school', None) or '').strip().lower()
                author_school = (getattr(getattr(post.author, 'profile', None), 'school', None) or '').strip().lower()
                if cur_school and author_school and cur_school == author_school:
                    allowed = True
                else:
                    cur_school_ids = {m.school_id for m in db.query(SchoolMember).filter(SchoolMember.user_id == current_user.id).all()}
                    author_school_ids = {m.school_id for m in db.query(SchoolMember).filter(SchoolMember.user_id == post.author_id).all()}
                    if cur_school_ids and author_school_ids and (cur_school_ids & author_school_ids):
                        allowed = True
            
            # 2. Followers check
            if not allowed and "followers" in privacy_set:
                is_follower = db.query(Follow).filter(
                    Follow.follower_id == current_user.id,
                    Follow.followed_id == post.author_id
                ).first() is not None
                if is_follower:
                    allowed = True

            # 3. Mentioned check
            if not allowed and "mentioned" in privacy_set:
                tag = f"@{current_user.username.lower()}"
                if tag in (post.content or "").lower() or tag in (post.title or "").lower():
                    allowed = True

            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="The author has restricted who can reply to this post."
                )

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


@router.post("/comments/{comment_id}/like")
def toggle_comment_like(comment_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.is_deleted == False).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    existing = db.query(CommentLike).filter(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False, "likes_count": db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()}

    db.add(CommentLike(comment_id=comment_id, user_id=current_user.id))
    db.commit()
    return {"liked": True, "likes_count": db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()}
