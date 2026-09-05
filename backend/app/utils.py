from sqlalchemy.orm import Session
from backend.app.models import User, Follow, Profile, Interest, Skill, UserMembership
from backend.app import membership_config as mconfig


def _membership_info(user: User, db: Session | None) -> dict | None:
    if db is None:
        return None
    membership = db.query(UserMembership).filter(
        UserMembership.user_id == user.id,
        UserMembership.status == 'active'
    ).order_by(UserMembership.expires_at.desc()).first()
    if not membership:
        return {'tier': None, 'active': False, 'name': mconfig.FREE_TIER['name'], 'color': mconfig.FREE_TIER['color'], 'perks': mconfig.FREE_TIER['perks']}
    cfg = mconfig.get_tier_config(membership.tier)
    return {
        'tier': membership.tier,
        'active': True,
        'name': cfg['name'],
        'color': cfg['color'],
        'perks': cfg['perks'],
        'expires_at': membership.expires_at,
    }


def format_user_out(user: User, current_user_id: int | None = None, db: Session | None = None) -> dict:
    followers_count = 0
    following_count = 0
    is_following = False
    follow_status = "none" # "none" | "pending" | "accepted"
    has_pending_request_from = False
    pending_requests_count = 0

    if db:
        followers_count = db.query(Follow).filter(
            Follow.followed_id == user.id,
            Follow.status == 'accepted'
        ).count()
        following_count = db.query(Follow).filter(
            Follow.follower_id == user.id,
            Follow.status == 'accepted'
        ).count()

        if current_user_id:
            if current_user_id == user.id:
                # Own profile: count pending follow requests received
                pending_requests_count = db.query(Follow).filter(
                    Follow.followed_id == user.id,
                    Follow.status == 'pending'
                ).count()
            else:
                # Other user's profile: check relationship between current_user and target user
                rel = db.query(Follow).filter(
                    Follow.follower_id == current_user_id,
                    Follow.followed_id == user.id
                ).first()
                if rel:
                    follow_status = rel.status
                    is_following = (rel.status == 'accepted')

                # Check if target user has sent a follow request to current user
                incoming = db.query(Follow).filter(
                    Follow.follower_id == user.id,
                    Follow.followed_id == current_user_id,
                    Follow.status == 'pending'
                ).first()
                has_pending_request_from = (incoming is not None)

    is_self = current_user_id and current_user_id == user.id

    profile_data = None
    if user.profile:
        profile_data = {
            "full_name": user.profile.full_name,
            "avatar_url": user.profile.avatar_url,
            "bio": user.profile.bio,
            "country": user.profile.country,
            "city": user.profile.city,
            "school": user.profile.school,
            "grade": user.profile.grade,
            "dob": user.profile.dob if (is_self or user.profile.show_dob) else None,
            "goals": user.profile.goals,
            "open_to_collab": user.profile.open_to_collab,
            "show_email": user.profile.show_email,
            "show_phone": user.profile.show_phone,
            "show_dob": user.profile.show_dob,
        }

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email if (is_self or (user.profile and user.profile.show_email)) else None,
        "is_email_verified": user.is_email_verified,
        "phone": user.phone if (is_self or (user.profile and user.profile.show_phone)) else None,
        "is_phone_verified": user.is_phone_verified,
        "role": user.role,
        "is_suspended": user.is_suspended,
        "is_banned": user.is_banned,
        "created_at": user.created_at,
        "last_seen": user.last_seen,
        "profile": profile_data,
        "interests": [i.name for i in user.interests] if user.interests else [],
        "skills": [s.name for s in user.skills] if user.skills else [],
        "followers_count": followers_count,
        "following_count": following_count,
        "is_following": is_following,
        "follow_status": follow_status,
        "has_pending_request_from": has_pending_request_from,
        "pending_requests_count": pending_requests_count,
        "membership": _membership_info(user, db),
    }
