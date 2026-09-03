"""Freemium quota enforcement (Tinder/Bumble style).

Tracks how many NEW conversations a user starts with people they don't already
chat with, and how many groups they join, within a rolling 24h window. Paid tiers
raise or remove the cap. Ongoing conversations stay unlimited.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from backend.app.models import UsageEvent, UserMembership
from backend.app import membership_config as mconfig

# Rolling 30-day window = "per month" cap.
WINDOW_DAYS = 30
UNLIMITED = float('inf')


def active_tier(db: Session, user_id: int) -> Optional[str]:
    m = db.query(UserMembership).filter(
        UserMembership.user_id == user_id,
        UserMembership.status == 'active'
    ).order_by(UserMembership.expires_at.desc()).first()
    if not m:
        return None
    if m.expires_at:
        now = datetime.now(timezone.utc)
        exp = m.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now:
            m.status = 'expired'
            try:
                db.commit()
            except Exception:
                db.rollback()
            return None
    return m.tier


def limit_for(tier: Optional[str], action: str) -> float:
    key = 'new_conversations_per_month' if action == 'new_conversation' else 'group_joins_per_month'
    cfg = mconfig.tier_quota(tier)
    val = cfg.get(key, 0)
    return UNLIMITED if val == -1 else int(val)


def used_count(db: Session, user_id: int, action: str) -> int:
    since = datetime.now(timezone.utc) - timedelta(days=WINDOW_DAYS)
    return db.query(UsageEvent).filter(
        UsageEvent.user_id == user_id,
        UsageEvent.action == action,
        UsageEvent.created_at >= since
    ).count()


def quota_status(db: Session, user_id: int, action: str) -> dict:
    tier = active_tier(db, user_id)
    limit = limit_for(tier, action)
    used = used_count(db, user_id, action)
    remaining = None if limit == UNLIMITED else max(0, int(limit) - used)
    resets_at = datetime.now(timezone.utc) + timedelta(days=WINDOW_DAYS)
    allowed = True if limit == UNLIMITED else used < int(limit)
    return {
        'tier': tier,
        'action': action,
        'limit': (None if limit == UNLIMITED else int(limit)),
        'used': used,
        'remaining': remaining,
        'resets_at': resets_at,
        'allowed': allowed,
    }


def quota_error_detail(status: dict) -> str:
    action_label = 'new conversations' if status['action'] == 'new_conversation' else 'group joins'
    limit = status['limit'] or 0
    return (
        f"You've reached your monthly limit of {limit} {action_label}. "
        f"Upgrade your membership to message more people and join more groups."
    )


def log_event(db: Session, user_id: int, action: str) -> None:
    db.add(UsageEvent(user_id=user_id, action=action))
    db.commit()
