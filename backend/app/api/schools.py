from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any, Optional
import secrets
import uuid
from datetime import datetime, timezone, timedelta

from backend.app import models, schemas
from backend.app.auth.security import get_current_user, get_current_user_optional, get_password_hash
from backend.app.database import get_db
from backend.app import email as mail
from backend.app.utils import format_user_out
import json

router = APIRouter()


def _normalize_school_name(name: str) -> str:
    """Normalize a school name for dedup matching.

    Strips case, extra whitespace, trailing punctuation, and common honorifics
    so 'Delhi Public School, Rohini', 'delhi public school rohini', and
    'DPS Rohini' can be linked to the same canonical record in the future.
    """
    if not name:
        return ""
    import unicodedata
    import re
    n = unicodedata.normalize("NFKD", name)
    n = "".join(c for c in n if not unicodedata.combining(c))
    n = n.lower()
    n = re.sub(r"[^a-z0-9]+", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n.strip(" ,.")


COMMON_ACRONYMS = {
    'dps': 'delhi public school',
    'aps': 'army public school',
    'kv': 'kendriya vidyalaya',
    'dav': 'dav public',
    'iit': 'indian institute of technology',
    'nit': 'national institute of technology',
    'bits': 'birla institute',
    'srcc': 'shri ram college',
    'step': 'step by step',
}


def find_or_create_school(db: Session, raw_school_name: str) -> Optional[models.School]:
    """Find the canonical School record or create one if none exists."""
    if not raw_school_name or not raw_school_name.strip():
        return None
    clean = raw_school_name.strip()

    # 1. Exact case-insensitive match
    s = db.query(models.School).filter(models.School.name.ilike(clean)).first()
    if s:
        return s

    # 2. Normalized match
    norm = _normalize_school_name(clean)
    if not norm:
        return None

    expanded_norm = norm
    for acr, full_name in COMMON_ACRONYMS.items():
        if acr == norm or f" {acr} " in f" {norm} ":
            expanded_norm = _normalize_school_name(norm.replace(acr, full_name))
            break

    for s in db.query(models.School).all():
        s_norm = _normalize_school_name(s.name)
        if s_norm == norm or (expanded_norm and s_norm == expanded_norm):
            return s

    # 3. Substring match
    if len(norm) >= 6:
        for s in db.query(models.School).all():
            s_norm = _normalize_school_name(s.name)
            if norm in s_norm or s_norm in norm:
                return s

    # 4. Create new canonical record
    s = models.School(name=clean)
    db.add(s)
    db.flush()
    return s


def sync_school_memberships_for_school(db: Session, school: models.School, exclude_user_id: Optional[int] = None):
    """Automatically ensure all students whose profile indicates this school
    are properly linked as SchoolMembers."""
    if not school:
        return
    db.flush()
    norm_target = _normalize_school_name(school.name)

    existing_user_ids = {
        m.user_id for m in db.query(models.SchoolMember.user_id).filter(
            models.SchoolMember.school_id == school.id
        ).all()
    }
    for obj in db.new:
        if isinstance(obj, models.SchoolMember) and obj.school_id == school.id:
            existing_user_ids.add(obj.user_id)

    if exclude_user_id:
        existing_user_ids.add(exclude_user_id)

    users_with_school = db.query(models.User).join(models.Profile).filter(
        models.User.is_banned == False,
        models.Profile.school.isnot(None)
    ).all()

    changed = False
    for u in users_with_school:
        if u.id in existing_user_ids:
            continue
        user_school = (u.profile.school or '').strip()
        if not user_school:
            continue

        matches = False
        if user_school.lower() == school.name.lower():
            matches = True
        elif norm_target and _normalize_school_name(user_school) == norm_target:
            matches = True
        elif len(user_school) >= 4 and (user_school.lower() in school.name.lower() or school.name.lower() in user_school.lower()):
            matches = True

        if matches and u.id not in existing_user_ids:
            db.add(models.SchoolMember(
                school_id=school.id,
                user_id=u.id,
                role='student'
            ))
            existing_user_ids.add(u.id)
            changed = True

    if changed:
        db.flush()


def _school_admins(db: Session, school_id: int):
    return db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.role.in_(['admin', 'ambassador'])
    ).all()


def _notify_school_admins(db, school_id, type, title, body, link=None):
    for m in _school_admins(db, school_id):
        admin = db.query(models.User).filter(models.User.id == m.user_id).first()
        if admin:
            mail.notify(db, admin, type, title, body, link)


@router.get("/my", response_model=List[schemas.SchoolOut])
def get_my_schools(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get schools the current user is a member of"""
    if current_user.profile and current_user.profile.school and current_user.profile.school.strip():
        school_obj = find_or_create_school(db, current_user.profile.school)
        if school_obj:
            existing_member = db.query(models.SchoolMember).filter(
                models.SchoolMember.user_id == current_user.id,
                models.SchoolMember.school_id == school_obj.id
            ).first()
            if not existing_member:
                new_member = models.SchoolMember(
                    school_id=school_obj.id,
                    user_id=current_user.id,
                    role='student'
                )
                db.add(new_member)
            sync_school_memberships_for_school(db, school_obj, exclude_user_id=current_user.id)

    school_members = db.query(models.SchoolMember).filter(models.SchoolMember.user_id == current_user.id).all()
    schools = []
    seen = set()
    for member in school_members:
        if member.school and member.school.id not in seen:
            seen.add(member.school.id)
            member.school.members_count = db.query(models.SchoolMember).filter(
                models.SchoolMember.school_id == member.school.id
            ).count()
            schools.append(member.school)
    return schools


@router.get("/my-invitations", response_model=List[schemas.SchoolInvitationOut])
def get_my_school_invitations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all pending school invitations for the current user."""
    invites = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.user_id == current_user.id,
        models.SchoolInvitation.status == 'pending'
    ).order_by(models.SchoolInvitation.created_at.desc()).all()
    return invites


import re

COMMON_ACRONYMS = {
    'dps': 'delhi public school',
    'kv': 'kendriya vidyalaya',
    'dav': 'dav public',
    'iit': 'indian institute of technology',
    'nit': 'national institute of technology',
    'bits': 'birla institute',
    'srcc': 'shri ram college',
    'step': 'step by step',
}

@router.get("/search", response_model=List[schemas.SchoolOut])
def search_schools(
    q: Optional[str] = "",
    limit: int = 15,
    db: Session = Depends(get_db)
):
    """Smart autocomplete search for schools with acronym expansion and campus matching."""
    clean_q = (q or "").strip().lower()
    all_schools = db.query(models.School).all()
    if not clean_q:
        return all_schools[:limit]

    # Clean alphanumeric version
    raw_alpha_q = re.sub(r'[^a-z0-9]', '', clean_q)

    # Expanded query with acronyms
    expanded_alpha_q = raw_alpha_q
    for acr, full_name in COMMON_ACRONYMS.items():
        if acr in clean_q:
            expanded_alpha_q = re.sub(r'[^a-z0-9]', '', clean_q.replace(acr, full_name))
            break

    scored = []
    seen_normalized = set()
    for s in all_schools:
        s_name_lower = s.name.lower()
        s_alpha = re.sub(r'[^a-z0-9]', '', s_name_lower)
        s_normalized = _normalize_school_name(s.name)

        score = 999
        # Exact prefix match
        if s_name_lower.startswith(clean_q):
            score = 0
        # Substring in raw name
        elif clean_q in s_name_lower:
            score = 1
        # Expanded acronym prefix
        elif s_alpha.startswith(expanded_alpha_q):
            score = 2
        # Expanded acronym substring
        elif expanded_alpha_q in s_alpha:
            score = 3
        # Raw alphanumeric substring
        elif raw_alpha_q in s_alpha:
            score = 4

        if score < 999:
            # Dedupe: keep the best-scoring row per normalized name. This stops
            # three identical "Delhi Public School, Rohini" rows from showing.
            if s_normalized and s_normalized in seen_normalized:
                continue
            if s_normalized:
                seen_normalized.add(s_normalized)
            scored.append((score, s))

    scored.sort(key=lambda item: (item[0], item[1].name))
    return [item[1] for item in scored[:limit]]


@router.get("", response_model=List[schemas.SchoolOut])
@router.get("/", response_model=List[schemas.SchoolOut])
def get_all_schools(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Public directory of schools. Returns the seeded verified catalog (always
    visible) plus any user-created schools that have at least one member. This
    way the directory is never empty once a seed list is in place."""
    # Seeded/verified schools are always shown to everyone.
    seeded_q = db.query(models.School).filter(models.School.verified == True)
    if limit or offset:
        seeded_q = seeded_q.order_by(models.School.name.asc()).offset(offset).limit(limit)
    seeded = seeded_q.all()
    seen = {s.id for s in seeded}

    if not current_user or current_user.role != 'admin':
        # Also surface schools that have at least one member (user-created hubs).
        member_school_ids = [r[0] for r in db.query(models.SchoolMember.school_id).distinct().all()]
        if member_school_ids:
            extras = db.query(models.School).filter(
                models.School.id.in_(member_school_ids),
                ~models.School.id.in_(seen)
            ).order_by(models.School.name.asc()).all()
            seeded.extend(extras)
    return seeded


@router.get("/suggestions", response_model=List[schemas.SchoolSuggestionOut])
def list_school_suggestions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List pending school suggestions (platform admin only)."""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return db.query(models.SchoolSuggestion).filter(models.SchoolSuggestion.status == 'pending').order_by(models.SchoolSuggestion.created_at.desc()).all()


@router.post("/seed", response_model=dict)
def seed_schools(
    records: List[dict],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Bulk-load or update the verified campus directory. Platform admin only.

    Accepts a JSON array of objects (same shape as the seed JSON files in
    backend/seeds/). Idempotent: re-running will not create duplicates.
    """
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Platform admin only")
    from backend.scripts.seed_schools import seed_from_dict
    stats = seed_from_dict(records)
    return stats


@router.post("/suggestions", response_model=schemas.SchoolSuggestionOut)
def suggest_school(
    data: schemas.SchoolSuggestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Students/teachers can suggest their school be added to the platform."""
    suggestion = models.SchoolSuggestion(
        name=data.name,
        description=data.description,
        contact_email=data.contact_email,
        city=data.city,
        country=data.country,
        requester_id=current_user.id,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)

    admins = db.query(models.User).filter(models.User.role == 'admin').all()
    for admin in admins:
        mail.notify(
            db, admin, 'school_suggestion',
            'New school suggestion',
            f"{current_user.username} suggested adding '{data.name}' to Edu Nexus.",
            None
        )
    return suggestion


@router.post("/suggestions/{suggestion_id}/approve", response_model=schemas.SchoolOut)
def approve_school_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Platform admin approves a suggestion and creates the school."""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    suggestion = db.query(models.SchoolSuggestion).filter(models.SchoolSuggestion.id == suggestion_id).first()
    if not suggestion or suggestion.status != 'pending':
        raise HTTPException(status_code=404, detail="Suggestion not found or already processed")

    school = models.School(name=suggestion.name, description=suggestion.description)
    db.add(school)
    db.commit()
    db.refresh(school)

    suggestion.status = 'approved'
    db.commit()

    if suggestion.contact_email:
        contact_email = suggestion.contact_email.lower()
        admin_user = db.query(models.User).filter(models.User.email == contact_email).first()
        if not admin_user:
            # Auto-provision the contact as the school's first admin and email
            # them a secure setup link. This removes the need for a manual
            # admin-creation step by a platform admin.
            local = contact_email.split('@')[0]
            base_username = ''.join(c for c in local if c.isalnum() or c == '_') or f"school{ school.id }"
            username = base_username[:30]
            suffix = 1
            while db.query(models.User).filter(models.User.username == username).first():
                username = f"{base_username[:26]}_{suffix}"
                suffix += 1

            setup_token = str(uuid.uuid4())
            admin_user = models.User(
                username=username,
                email=contact_email,
                hashed_password=get_password_hash(secrets.token_urlsafe(16)),
                role='student',
                is_email_verified=True,
                reset_password_token=setup_token,
                reset_password_expires=datetime.now(timezone.utc) + timedelta(days=7),
            )
            db.add(admin_user)
            db.flush()
            avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}"
            db.add(models.Profile(
                user_id=admin_user.id,
                full_name=f"{suggestion.name} Admin",
                avatar_url=avatar_url,
                school=suggestion.name,
            ))
            db.add(models.SchoolMember(school_id=school.id, user_id=admin_user.id, role='admin'))
            db.commit()
            mail.send_account_setup_email(contact_email, f"{suggestion.name} Admin", suggestion.name, setup_token)

        mail.send_notification_email(
            contact_email,
            "Your school is now on Edu Nexus",
            f"Great news! '{suggestion.name}' has been added to Edu Nexus. Check your email for your admin login to customize the school hub and invite students."
        )
    return school


@router.post("", response_model=schemas.SchoolOut)
@router.post("/", response_model=schemas.SchoolOut)
def create_school(
    school_in: schemas.SchoolCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new school. Only platform admins can do this."""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    db_school = models.School(**school_in.model_dump())
    db.add(db_school)
    db.commit()
    db.refresh(db_school)

    member = models.SchoolMember(school_id=db_school.id, user_id=current_user.id, role='admin')
    db.add(member)
    db.commit()

    return db_school


@router.post("/admins", response_model=schemas.UserOut)
def create_school_admin(
    data: schemas.SchoolAdminCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Platform admin creates a school-admin account and assigns them to a school."""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    school = db.query(models.School).filter(models.School.id == data.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    existing_email = db.query(models.User).filter(models.User.email == data.email.lower()).first()
    if existing_email:
        pending_inv = db.query(models.SchoolInvitation).filter(
            models.SchoolInvitation.school_id == school.id,
            models.SchoolInvitation.user_id == existing_email.id,
            models.SchoolInvitation.role == 'admin',
            models.SchoolInvitation.status.in_(['pending', 'declined', 'expired'])
        ).first()
        # Older versions created the provisional user before recording the invitation.
        # An unconsumed setup token is authoritative: this is not an activated account.
        unactivated = bool(existing_email.reset_password_token)
        if unactivated and not pending_inv:
            pending_inv = models.SchoolInvitation(
                school_id=school.id, user_id=existing_email.id,
                invited_by_id=current_user.id, role='admin', status='pending'
            )
            db.add(pending_inv)
        if pending_inv and unactivated:
            existing_email.reset_password_token = str(uuid.uuid4())
            existing_email.reset_password_expires = datetime.now(timezone.utc) + timedelta(days=7)
            pending_inv.status = 'pending'
            db.commit()
            mail.send_account_setup_email(existing_email.email, data.full_name or existing_email.profile.full_name, school.name, existing_email.reset_password_token)
            return format_user_out(existing_email, existing_email.id, db)
        raise HTTPException(status_code=400, detail="This email already belongs to an active EduNexus account.")
    if db.query(models.User).filter(models.User.username == data.username.lower()).first():
        raise HTTPException(status_code=400, detail="Username is already taken.")

    # Never store/email a plaintext password. Generate a one-time setup token
    # (reusing the reset-password mechanism) and email a "set password" link.
    setup_token = str(uuid.uuid4())
    new_user = models.User(
        username=data.username.lower(),
        email=data.email.lower(),
        hashed_password=get_password_hash(secrets.token_urlsafe(16)),
        role='student',
        is_email_verified=True,
        reset_password_token=setup_token,
        reset_password_expires=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(new_user)
    db.flush()

    avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={new_user.username}"
    db.add(models.Profile(user_id=new_user.id, full_name=data.full_name, avatar_url=avatar_url, school=school.name))

    db.add(models.SchoolMember(school_id=school.id, user_id=new_user.id, role='admin'))
    db.add(models.SchoolInvitation(school_id=school.id, user_id=new_user.id, invited_by_id=current_user.id, role='admin', status='pending'))
    db.commit()
    db.refresh(new_user)

    mail.send_account_setup_email(new_user.email, data.full_name, school.name, setup_token)

    return format_user_out(new_user, new_user.id, db)

@router.get("/admin-invites/{token}")
def get_admin_invite_details(token: str, db: Session = Depends(get_db)):
    """Public inspection of a school admin invite token."""
    inv = db.query(models.SchoolInvitation).filter(models.SchoolInvitation.token == token).first()
    if not inv:
        user_legacy = db.query(models.User).filter(models.User.reset_password_token == token).first()
        if user_legacy:
            inv = db.query(models.SchoolInvitation).filter(
                models.SchoolInvitation.user_id == user_legacy.id,
                models.SchoolInvitation.role == 'admin'
            ).order_by(models.SchoolInvitation.created_at.desc()).first()

    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or invalid link.")

    now = datetime.now(timezone.utc)
    is_expired = bool(inv.expires_at and inv.expires_at < now)
    if is_expired and inv.status == 'pending':
        inv.status = 'expired'
        db.commit()

    target_email = inv.email or (inv.user.email if inv.user else "")
    existing_user = db.query(models.User).filter(models.User.email == target_email.lower()).first() if target_email else None

    return {
        "id": inv.id,
        "school_id": inv.school_id,
        "school_name": inv.school.name if inv.school else "Unknown Campus",
        "school_logo": inv.school.logo_url if inv.school else None,
        "email": target_email,
        "role": inv.role or "admin",
        "status": inv.status,
        "expires_at": inv.expires_at,
        "is_expired": inv.status == 'expired' or is_expired,
        "user_exists": bool(existing_user),
        "existing_username": existing_user.username if existing_user else None
    }


@router.post("/admin-invites/{token}/respond")
def respond_admin_invite(
    token: str,
    data: schemas.SchoolAdminInviteRespond,
    db: Session = Depends(get_db)
):
    """Accept or reject a school admin invite token."""
    inv = db.query(models.SchoolInvitation).filter(models.SchoolInvitation.token == token).first()
    if not inv:
        user_legacy = db.query(models.User).filter(models.User.reset_password_token == token).first()
        if user_legacy:
            inv = db.query(models.SchoolInvitation).filter(
                models.SchoolInvitation.user_id == user_legacy.id,
                models.SchoolInvitation.role == 'admin'
            ).order_by(models.SchoolInvitation.created_at.desc()).first()

    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or invalid token.")

    now = datetime.now(timezone.utc)
    if (inv.expires_at and inv.expires_at < now) or inv.status == 'expired':
        inv.status = 'expired'
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation has expired. Please contact the platform administrator to receive a new invite.")

    if inv.status != 'pending':
        raise HTTPException(status_code=400, detail=f"This invitation has already been {inv.status}.")

    action = (data.action or "").strip().lower()
    if action in ['reject', 'decline']:
        inv.status = 'rejected'
        db.commit()
        return {"status": "rejected", "message": "You have declined the school administrator invitation."}

    if action != 'accept':
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'.")

    # ACCEPT INVITE
    school = inv.school
    target_email = (inv.email or (inv.user.email if inv.user else "")).strip().lower()

    target_user = None
    if inv.user_id:
        target_user = db.query(models.User).filter(models.User.id == inv.user_id).first()
    if not target_user and target_email:
        target_user = db.query(models.User).filter(models.User.email == target_email).first()

    if not target_user:
        # Create brand new user
        if not data.password or len(data.password.strip()) < 6:
            raise HTTPException(status_code=400, detail="Please provide a password of at least 6 characters.")

        import re
        base_uname = re.sub(r'[^a-z0-9_]', '', (data.full_name or target_email.split('@')[0]).lower()) or "admin"
        uname = base_uname
        suffix = 1
        while db.query(models.User).filter(models.User.username == uname).first():
            uname = f"{base_uname}{suffix}"
            suffix += 1

        target_user = models.User(
            username=uname,
            email=target_email,
            hashed_password=get_password_hash(data.password.strip()),
            role='student',
            is_email_verified=True
        )
        db.add(target_user)
        db.flush()

        avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={target_user.username}"
        db.add(models.Profile(
            user_id=target_user.id,
            full_name=data.full_name or uname.title(),
            avatar_url=avatar_url,
            school=school.name if school else None
        ))
        db.flush()
    else:
        # Existing user
        if school and target_user.profile:
            target_user.profile.school = school.name
            db.flush()

    # Assign SchoolMember with role='admin'
    existing_mem = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == inv.school_id,
        models.SchoolMember.user_id == target_user.id
    ).first()

    if existing_mem:
        existing_mem.role = 'admin'
    else:
        new_mem = models.SchoolMember(
            school_id=inv.school_id,
            user_id=target_user.id,
            role='admin'
        )
        db.add(new_mem)

    inv.user_id = target_user.id
    inv.status = 'accepted'
    db.commit()

    return {
        "status": "accepted",
        "message": f"Congratulations! You are now the Administrator of {school.name if school else 'your campus'}.",
        "username": target_user.username,
        "school_id": inv.school_id
    }


@router.post("/admin-invitations/{token}/reject")
def reject_admin_invitation(token: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_password_token == token).first()
    if not user: raise HTTPException(status_code=404, detail="Invitation not found or expired")
    inv = db.query(models.SchoolInvitation).filter(models.SchoolInvitation.user_id == user.id, models.SchoolInvitation.role == 'admin', models.SchoolInvitation.status == 'pending').first()
    if not inv: raise HTTPException(status_code=400, detail="Invitation is no longer pending")
    inv.status = 'declined'; db.commit()
    return {"message": "Invitation declined"}


@router.get("/{school_id}", response_model=schemas.SchoolOut)
def get_school_details(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get school details"""
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    member = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id
    ).first()
    if not member and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not a member of this school")

    return school


@router.put("/{school_id}", response_model=schemas.SchoolOut)
def update_school_info(
    school_id: int,
    data: schemas.SchoolUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update school details. Strictly restricted to Platform Admins ONLY. School admins cannot change school info."""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only EduNexus Platform Admins can modify school information. School administrators are not permitted to change school details."
        )

    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    if data.name is not None and data.name.strip():
        school.name = data.name.strip()
    if data.district is not None:
        school.district = data.district.strip() if data.district else None
    if data.address is not None:
        school.address = data.address.strip() if data.address else None
    if data.city is not None:
        school.city = data.city.strip() if data.city else None
    if data.state is not None:
        school.state = data.state.strip() if data.state else None
    if data.country is not None:
        school.country = data.country.strip() if data.country else "India"
    if data.verified is not None:
        school.verified = data.verified

    db.commit()
    db.refresh(school)
    return school


@router.get("/{school_id}/members", response_model=List[schemas.SchoolMemberOut])
def get_school_members(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get members of a school with automatic classmates synchronization and rich profile formatting."""
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Automatically synchronize any students whose profile has this school
    sync_school_memberships_for_school(db, school)

    members = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id
    ).join(models.User).filter(
        models.User.is_banned == False
    ).order_by(models.SchoolMember.created_at.desc()).all()

    return [
        {
            "id": m.id,
            "school_id": m.school_id,
            "role": m.role or "student",
            "user": format_user_out(m.user, current_user.id, db),
            "created_at": m.created_at or datetime.now(timezone.utc),
        }
        for m in members if m.user
    ]


@router.get("/{school_id}/posts", response_model=List[schemas.PostOut])
def get_school_posts(
    school_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get posts published by students of this school or posts shared to this school community."""
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Member user IDs for this school
    member_user_ids = [
        m.user_id for m in db.query(models.SchoolMember).filter(models.SchoolMember.school_id == school_id).all()
    ]
    # Plus any users whose profile has this school
    profile_user_ids = [
        u.id for u in db.query(models.User).join(models.Profile).filter(
            models.User.is_banned == False,
            models.Profile.school.ilike(school.name)
        ).all()
    ]
    all_school_user_ids = set(member_user_ids + profile_user_ids)

    from backend.app.api.posts import format_post_out
    posts = db.query(models.Post).filter(
        models.Post.is_deleted == False,
        (models.Post.author_id.in_(all_school_user_ids)) | 
        (models.Post.audience_community_id == school_id)
    ).order_by(models.Post.created_at.desc()).offset(offset).limit(limit).all()

    return [format_post_out(p, current_user.id, db) for p in posts]

@router.get("/{school_id}/invite-candidates")
def get_invite_candidates(school_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school or not _school_staff(db, school_id, current_user):
        raise HTTPException(status_code=403, detail='Only school staff can discover invite candidates')
    member_ids = {m.user_id for m in db.query(models.SchoolMember).filter(models.SchoolMember.school_id == school_id).all()}
    users = db.query(models.User).join(models.Profile, models.User.id == models.Profile.user_id).filter(models.User.is_banned == False, models.Profile.school.ilike(school.name)).limit(100).all()
    return [format_user_out(u, current_user.id, db) for u in users if u.id not in member_ids and u.id != current_user.id]


@router.post("/{school_id}/members", response_model=schemas.SchoolMemberOut)
def add_school_member(
    school_id: int,
    member_in: schemas.SchoolMemberCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add a member to a school (School admin only)"""
    admin = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role == 'admin'
    ).first()

    if not admin and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    user_to_add = db.query(models.User).filter(models.User.id == member_in.user_id).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == member_in.user_id
    ).first()

    if existing:
        existing.role = member_in.role
        db.commit()
        db.refresh(existing)
        return existing

    new_member = models.SchoolMember(
        school_id=school_id,
        user_id=member_in.user_id,
        role=member_in.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


@router.get("/{school_id}/clubs", response_model=List[schemas.SchoolClubOut])
def get_school_clubs(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    clubs = db.query(models.SchoolClub).filter(models.SchoolClub.school_id == school_id).all()
    for club in clubs:
        club.members_count = db.query(models.SchoolClubMember).filter(models.SchoolClubMember.club_id == club.id).count()
    return clubs


@router.post("/{school_id}/clubs", response_model=schemas.SchoolClubOut)
def create_school_club(
    school_id: int,
    club_in: schemas.SchoolClubCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    admin = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role.in_(['admin', 'ambassador'])
    ).first()

    if not admin and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only school admins can create clubs")

    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    club = models.SchoolClub(school_id=school_id, **club_in.model_dump())
    db.add(club)
    db.commit()
    db.refresh(club)
    # Announce new clubs to every current school member.
    members = db.query(models.SchoolMember).filter(models.SchoolMember.school_id == school_id).all()
    for school_member in members:
        recipient = db.query(models.User).filter(models.User.id == school_member.user_id).first()
        if recipient and recipient.id != current_user.id:
            mail.notify(db, recipient, 'school_club_created', f'New club at {school.name}', f'{club.name} was just created in your school. Join the club from School Hub.', '/app/school')
    db.add(models.SchoolAnnouncement(school_id=school_id, author_id=current_user.id, title=f'New club: {club.name}', content=f'{club.name} is now open for members. {club.description or "Join from the Clubs tab in School Hub."}'))
    db.commit()
    return club


@router.post("/{school_id}/clubs/{club_id}/join", response_model=schemas.SchoolClubMemberOut)
def join_school_club(
    school_id: int,
    club_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Join a club (must be a member of the school)."""
    member = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id
    ).first()
    if not member and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="You must be a member of this school to join its clubs")

    club = db.query(models.SchoolClub).filter(models.SchoolClub.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    if club.school_id != school_id:
        raise HTTPException(status_code=400, detail="Club does not belong to this school")

    existing = db.query(models.SchoolClubMember).filter(
        models.SchoolClubMember.club_id == club_id,
        models.SchoolClubMember.user_id == current_user.id
    ).first()
    if existing:
        return existing

    new_member = models.SchoolClubMember(club_id=club_id, user_id=current_user.id)
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member


@router.get("/{school_id}/events", response_model=List[schemas.SchoolEventOut])
def get_school_events(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.SchoolEvent).filter(models.SchoolEvent.school_id == school_id).order_by(models.SchoolEvent.event_date.asc()).all()


@router.post("/{school_id}/events", response_model=schemas.SchoolEventOut)
def create_school_event(
    school_id: int,
    event_in: schemas.SchoolEventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    admin = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role.in_(['admin', 'ambassador'])
    ).first()

    if not admin and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only school admins can create events")

    event = models.SchoolEvent(
        school_id=school_id,
        created_by_id=current_user.id,
        **event_in.model_dump()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{school_id}/announcements", response_model=List[schemas.SchoolAnnouncementOut])
def get_school_announcements(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.SchoolAnnouncement).filter(models.SchoolAnnouncement.school_id == school_id).order_by(models.SchoolAnnouncement.created_at.desc()).all()


@router.post("/{school_id}/announcements", response_model=schemas.SchoolAnnouncementOut)
def create_school_announcement(
    school_id: int,
    announcement_in: schemas.SchoolAnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    admin = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role.in_(['admin', 'ambassador'])
    ).first()

    if not admin and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only school admins/ambassadors can create announcements")

    announcement = models.SchoolAnnouncement(
        school_id=school_id,
        author_id=current_user.id,
        **announcement_in.model_dump()
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


@router.post("/invitations/{invite_id}/accept", response_model=schemas.SchoolMemberOut)
def accept_school_invitation(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Accept an invitation to join a school."""
    inv = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.id == invite_id,
        models.SchoolInvitation.user_id == current_user.id
    ).first()
    if not inv or inv.status != 'pending':
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")

    inv.status = 'accepted'

    # Check if already a member
    existing = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == inv.school_id,
        models.SchoolMember.user_id == current_user.id
    ).first()
    if not existing:
        member = models.SchoolMember(
            school_id=inv.school_id,
            user_id=current_user.id,
            role=inv.role or 'student'
        )
        db.add(member)
    else:
        member = existing
        if inv.role:
            member.role = inv.role

    # Update user profile's school name if empty
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if profile and (not profile.school or profile.school.strip() == ''):
        if inv.school:
            profile.school = inv.school.name

    db.commit()
    db.refresh(member)

    # Notify school admins
    school_name = inv.school.name if inv.school else 'the school'
    _notify_school_admins(
        db, inv.school_id, 'school_invite_accepted',
        'Invitation accepted',
        f"{current_user.username} accepted the invitation to join {school_name}.",
        '/app/school'
    )

    return member


@router.post("/invitations/{invite_id}/decline")
def decline_school_invitation(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Decline a school invitation."""
    inv = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.id == invite_id,
        models.SchoolInvitation.user_id == current_user.id
    ).first()
    if not inv or inv.status != 'pending':
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")

    inv.status = 'declined'
    db.commit()
    return {"message": "Invitation declined"}


@router.post("/{school_id}/invitations", response_model=schemas.SchoolInvitationOut)
def send_school_invitation(
    school_id: int,
    data: schemas.SchoolInvitationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """School admin or ambassador invites a student/user to join the school."""
    admin = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role.in_(['admin', 'ambassador'])
    ).first()
    if not admin and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only school admins/ambassadors can invite members")

    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    query_target = data.username_or_email.strip().lower()
    target_user = db.query(models.User).filter(
        (models.User.username == query_target) | (models.User.email == query_target)
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"No user found with username or email '{data.username_or_email}'")

    # Check if already a member
    if db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == target_user.id
    ).first():
        raise HTTPException(status_code=400, detail=f"{target_user.username} is already a member of this school")

    # Check if invitation is already pending
    existing_inv = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.school_id == school_id,
        models.SchoolInvitation.user_id == target_user.id,
        models.SchoolInvitation.status == 'pending'
    ).first()
    if existing_inv:
        raise HTTPException(status_code=400, detail=f"An invitation is already pending for {target_user.username}")

    role_name = (data.role or 'student').strip()

    inv = models.SchoolInvitation(
        school_id=school_id,
        user_id=target_user.id,
        invited_by_id=current_user.id,
        role=role_name,
        status='pending'
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    # Send in-app notification
    mail.notify(
        db, target_user, 'school_invitation',
        f"Invitation to join {school.name}",
        f"The administrator of {school.name} has invited you to join their official School Hub as a {role_name}.",
        '/app/school'
    )

    return inv


@router.get("/{school_id}/invitations", response_model=List[schemas.SchoolInvitationOut])
def get_school_invitations(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List pending invitations sent by this school (School admin only)."""
    admin = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role.in_(['admin', 'ambassador'])
    ).first()
    if not admin and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    invitations = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.school_id == school_id,
    ).order_by(models.SchoolInvitation.created_at.desc()).all()
    now = datetime.now(timezone.utc)
    for inv in invitations:
        if inv.status == 'pending' and inv.created_at and (now - inv.created_at).days >= 7:
            inv.status = 'expired'
    db.commit()
    return invitations


@router.delete("/{school_id}/invitations/{invite_id}")
def cancel_school_invitation(
    school_id: int,
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Cancel a pending invitation (School admin only)."""
    admin = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role.in_(['admin', 'ambassador'])
    ).first()
    if not admin and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")

    inv = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.id == invite_id,
        models.SchoolInvitation.school_id == school_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")

    db.delete(inv)
    db.commit()
    return {"message": "Invitation cancelled"}


@router.get("/{school_id}/join-status")
def get_join_status(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Return the current user's relationship to a school: membership, pending invitation, or none."""
    member = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id
    ).first()
    if member:
        return {"status": "member", "role": member.role}

    inv = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.school_id == school_id,
        models.SchoolInvitation.user_id == current_user.id,
        models.SchoolInvitation.status == 'pending'
    ).first()
    if inv:
        return {"status": "invited", "invitation_id": inv.id, "role": inv.role}

    return {"status": "none"}



# ---------------------------------------------------------------------------
# Custom role system: each school can define its own role labels and assign
# them to members. School admins manage roles entirely from within the app.
# ---------------------------------------------------------------------------

SYSTEM_ROLES = {'admin', 'ambassador', 'student'}
MAX_SCHOOL_ADMINS = 3


def _school_admin_member(db, school_id, current_user):
    return db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role == 'admin'
    ).first()


@router.get("/{school_id}/roles", response_model=List[schemas.SchoolRoleOut])
def list_school_roles(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    member = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id
    ).first()
    if not member and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not a member of this school")

    existing = db.query(models.SchoolRole).filter(models.SchoolRole.school_id == school_id).all()
    if not existing:
        # Seed default system-like roles on first access
        for name, perms in [
            ('admin', {"manage_members": True, "manage_content": True, "manage_roles": True}),
            ('ambassador', {"manage_content": True}),
            ('student', {}),
        ]:
            db.add(models.SchoolRole(
                school_id=school_id, name=name, is_system=True,
                description=f"Default {name} role", permissions=perms
            ))
        db.commit()
        existing = db.query(models.SchoolRole).filter(models.SchoolRole.school_id == school_id).all()
    return existing


@router.post("/{school_id}/roles", response_model=schemas.SchoolRoleOut)
def create_school_role(
    school_id: int,
    data: schemas.SchoolRoleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not _school_admin_member(db, school_id, current_user) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only school admins can create roles")

    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name required")
    if name.lower() in SYSTEM_ROLES:
        raise HTTPException(status_code=400, detail="Use a custom role name (not admin/ambassador/student)")

    if db.query(models.SchoolRole).filter(models.SchoolRole.school_id == school_id, models.SchoolRole.name == name).first():
        raise HTTPException(status_code=400, detail="Role already exists")

    role = models.SchoolRole(
        school_id=school_id,
        name=name,
        description=data.description,
        color=data.color or '#22e079',
        # Custom roles can never escalate to school-admin authority.
        permissions={k: v for k, v in (data.permissions or {}).items() if k not in {'manage_roles', 'manage_members', 'make_admin'}},
        is_system=False
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.put("/{school_id}/members/{user_id}/role", response_model=schemas.SchoolMemberOut)
def set_member_role(
    school_id: int,
    user_id: int,
    data: schemas.SchoolMemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not _school_admin_member(db, school_id, current_user) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only school admins can change roles")

    member = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if target_user and target_user.role == 'admin' and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Platform Admin accounts are protected and can only be changed by a Platform Admin")
    if member.role == 'admin' and user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="School admins cannot change another school admin's role")

    # Prevent removing the last admin (unless performed by Platform Admin)
    if member.role == 'admin' and data.role != 'admin' and current_user.role != 'admin':
        admin_count = db.query(models.SchoolMember).filter(
            models.SchoolMember.school_id == school_id,
            models.SchoolMember.role == 'admin'
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="A school must keep at least one admin")

    # Validate role name (system or custom defined for this school)
    role_name = data.role.strip()
    is_valid = role_name in SYSTEM_ROLES or db.query(models.SchoolRole).filter(
        models.SchoolRole.school_id == school_id, models.SchoolRole.name == role_name
    ).first() is not None
    if not is_valid:
        raise HTTPException(status_code=400, detail="Unknown role for this school")

    if role_name == 'admin' and member.role != 'admin':
        admin_count = db.query(models.SchoolMember).filter(
            models.SchoolMember.school_id == school_id,
            models.SchoolMember.role == 'admin'
        ).count()
        if admin_count >= MAX_SCHOOL_ADMINS and current_user.role != 'admin':
            raise HTTPException(status_code=400, detail="This school already has the maximum of 3 admins. Ask the EduNexus Platform Admin for additional admin access.")

    member.role = role_name
    db.commit()
    db.refresh(member)
    return member


@router.post("/{school_id}/members/{user_id}/revoke-admin", response_model=schemas.SchoolMemberOut)
def revoke_school_admin_role(
    school_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Revoke school admin status from a user. Only Platform Admins can remove school admins."""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only EduNexus Platform Admins can revoke School Administrator access."
        )

    member = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="School member not found")

    member.role = 'student'

    # Mark any invitations for this user and school as revoked
    invites = db.query(models.SchoolInvitation).filter(
        models.SchoolInvitation.school_id == school_id,
        models.SchoolInvitation.user_id == user_id
    ).all()
    for inv in invites:
        inv.status = 'revoked'

    db.commit()
    db.refresh(member)
    return member

@router.patch("/{school_id}/roles/{role_id}", response_model=schemas.SchoolRoleOut)
def update_school_role(school_id: int, role_id: int, data: schemas.SchoolRoleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not _school_admin_member(db, school_id, current_user) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail='Only school admins can edit roles')
    role = db.query(models.SchoolRole).filter(models.SchoolRole.id == role_id, models.SchoolRole.school_id == school_id).first()
    if not role: raise HTTPException(status_code=404, detail='Role not found')
    if role.name.lower() == 'admin': raise HTTPException(status_code=400, detail='The Platform Admin role cannot be edited')
    role.name = data.name.strip()
    role.description = data.description
    role.permissions = {k: v for k, v in (data.permissions or {}).items() if k not in {'manage_roles', 'manage_members', 'make_admin'}}
    db.commit(); db.refresh(role)
    return role


@router.delete("/{school_id}/members/{user_id}", response_model=schemas.SchoolMemberOut)
def remove_member(
    school_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not _school_admin_member(db, school_id, current_user) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only school admins can remove members")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself")

    member = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if target_user and target_user.role == 'admin' and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Platform Admin accounts are protected and can only be removed by a Platform Admin")
    if member.role == 'admin' and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="School admins cannot remove another school admin")

    if member.role == 'admin' and current_user.role != 'admin':
        admin_count = db.query(models.SchoolMember).filter(
            models.SchoolMember.school_id == school_id,
            models.SchoolMember.role == 'admin'
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin")

    db.delete(member)
    db.commit()
    return member


# ---------------------------------------------------------------------------
# Shareable school join links
# A school admin/ambassador generates a token link (e.g. shareable on social
# media). Only existing Edu Nexus accounts can redeem it (the confirm endpoint
# requires authentication), so it cannot be used to create anonymous members.
# ---------------------------------------------------------------------------

def _school_staff(db, school_id, current_user):
    return db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == school_id,
        models.SchoolMember.user_id == current_user.id,
        models.SchoolMember.role.in_(['admin', 'ambassador'])
    ).first()


def _join_link_url(token: str) -> str:
    return f"{mail.FRONTEND_BASE}/join/school?token={token}"


@router.post("/{school_id}/join-links", response_model=schemas.SchoolJoinLinkOut)
def create_join_link(
    school_id: int,
    data: schemas.SchoolJoinLinkCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a shareable join link for the school (admin/ambassador only)."""
    if not _school_staff(db, school_id, current_user) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Only school admins/ambassadors can create join links")

    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    role_name = (data.role or 'student').strip()
    is_valid = role_name in SYSTEM_ROLES or db.query(models.SchoolRole).filter(
        models.SchoolRole.school_id == school_id, models.SchoolRole.name == role_name
    ).first() is not None
    if not is_valid:
        raise HTTPException(status_code=400, detail="Unknown role for this school")

    link = models.SchoolJoinLink(
        school_id=school_id,
        token=secrets.token_urlsafe(24),
        role=role_name,
        created_by_id=current_user.id,
        expires_at=data.expires_at,
        max_uses=data.max_uses,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return _join_link_out(link)


@router.get("/{school_id}/join-links", response_model=List[schemas.SchoolJoinLinkOut])
def list_join_links(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List join links created for this school (admin/ambassador only)."""
    if not _school_staff(db, school_id, current_user) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")
    links = db.query(models.SchoolJoinLink).filter(
        models.SchoolJoinLink.school_id == school_id
    ).order_by(models.SchoolJoinLink.created_at.desc()).all()
    return [_join_link_out(l) for l in links]


@router.delete("/{school_id}/join-links/{link_id}")
def disable_join_link(
    school_id: int,
    link_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Disable (revoke) a join link (admin/ambassador only)."""
    if not _school_staff(db, school_id, current_user) and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not enough permissions")
    link = db.query(models.SchoolJoinLink).filter(
        models.SchoolJoinLink.id == link_id,
        models.SchoolJoinLink.school_id == school_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Join link not found")
    link.active = False
    db.commit()
    return {"message": "Join link disabled"}


def _join_link_out(link: models.SchoolJoinLink) -> schemas.SchoolJoinLinkOut:
    return schemas.SchoolJoinLinkOut(
        id=link.id,
        school_id=link.school_id,
        token=link.token,
        link=_join_link_url(link.token),
        role=link.role,
        expires_at=link.expires_at,
        max_uses=link.max_uses,
        used_count=link.used_count,
        active=link.active,
        created_at=link.created_at,
    )


@router.get("/join/{token}", response_model=schemas.SchoolJoinPreview)
def preview_join_link(
    token: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Public preview of a join link. Tells the client which school/role, and
    whether the (optional) current user is already a member. Redeeming still
    requires being logged in."""
    link = db.query(models.SchoolJoinLink).filter(models.SchoolJoinLink.token == token).first()
    if not link or not link.active:
        return schemas.SchoolJoinPreview(
            school_id=0, school_name="", role="", valid=False,
            message="This join link is invalid or has been disabled."
        )
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        return schemas.SchoolJoinPreview(
            school_id=link.school_id, school_name=link.school.name, role=link.role,
            valid=False, message="This join link has expired."
        )
    if link.max_uses is not None and link.used_count >= link.max_uses:
        return schemas.SchoolJoinPreview(
            school_id=link.school_id, school_name=link.school.name, role=link.role,
            valid=False, message="This join link has reached its usage limit."
        )

    already_member = False
    if current_user:
        existing = db.query(models.SchoolMember).filter(
            models.SchoolMember.school_id == link.school_id,
            models.SchoolMember.user_id == current_user.id
        ).first()
        already_member = existing is not None

    return schemas.SchoolJoinPreview(
        school_id=link.school_id,
        school_name=link.school.name,
        role=link.role,
        requires_login=current_user is None,
        already_member=already_member,
        valid=True,
    )


@router.post("/join/{token}/confirm", response_model=schemas.SchoolMemberOut)
def confirm_join_link(
    token: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Redeem a join link. Requirement: the user must already have an Edu Nexus
    account (enforced by the auth dependency)."""
    link = db.query(models.SchoolJoinLink).filter(models.SchoolJoinLink.token == token).first()
    if not link or not link.active:
        raise HTTPException(status_code=404, detail="Invalid or disabled join link")
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This join link has expired")
    if link.max_uses is not None and link.used_count >= link.max_uses:
        raise HTTPException(status_code=410, detail="This join link has reached its usage limit")

    existing = db.query(models.SchoolMember).filter(
        models.SchoolMember.school_id == link.school_id,
        models.SchoolMember.user_id == current_user.id
    ).first()
    if existing:
        existing.role = link.role
        db.commit()
        db.refresh(existing)
        return existing

    member = models.SchoolMember(
        school_id=link.school_id,
        user_id=current_user.id,
        role=link.role,
    )
    db.add(member)
    link.used_count += 1
    db.commit()
    db.refresh(member)

    school = link.school
    _notify_school_admins(
        db, link.school_id, 'school_join_link',
        'New member via join link',
        f"{current_user.username} joined {school.name} using a shareable link.",
        '/app/school'
    )
    return member
