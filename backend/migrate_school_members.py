import re
import sys
import os
import unicodedata
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import SessionLocal
from backend.app import models

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


def normalize_school_name(name: str) -> str:
    if not name:
        return ""
    n = unicodedata.normalize("NFKD", name)
    n = "".join(c for c in n if not unicodedata.combining(c))
    n = n.lower()
    n = re.sub(r"[^a-z0-9]+", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n.strip(" ,.")


def find_canonical_school(db, raw_name: str) -> models.School:
    clean = raw_name.strip()
    if not clean:
        return None

    # 1. Exact case-insensitive match
    s = db.query(models.School).filter(models.School.name.ilike(clean)).first()
    if s:
        return s

    # 2. Normalized match
    norm = normalize_school_name(clean)
    if not norm:
        return None

    # Expand acronym if needed
    expanded_norm = norm
    for acr, full_name in COMMON_ACRONYMS.items():
        if acr == norm or f" {acr} " in f" {norm} ":
            expanded_norm = normalize_school_name(norm.replace(acr, full_name))
            break

    for s in db.query(models.School).all():
        s_norm = normalize_school_name(s.name)
        if s_norm == norm or (expanded_norm and s_norm == expanded_norm):
            return s

    # 3. Substring match
    if len(norm) >= 6:
        for s in db.query(models.School).all():
            s_norm = normalize_school_name(s.name)
            if norm in s_norm or s_norm in norm:
                return s

    # 4. Create new canonical record
    s = models.School(name=clean)
    db.add(s)
    db.flush()
    return s


def run_migration():
    print("[migrate_school_members] Starting school members synchronization...")
    db = SessionLocal()
    try:
        users = db.query(models.User).join(models.Profile).filter(
            models.User.is_banned == False,
            models.Profile.school.isnot(None)
        ).all()

        linked_count = 0
        for u in users:
            school_str = (u.profile.school or "").strip()
            if not school_str:
                continue

            canonical = find_canonical_school(db, school_str)
            if not canonical:
                continue

            existing = db.query(models.SchoolMember).filter(
                models.SchoolMember.school_id == canonical.id,
                models.SchoolMember.user_id == u.id
            ).first()

            if not existing:
                db.add(models.SchoolMember(
                    school_id=canonical.id,
                    user_id=u.id,
                    role='student'
                ))
                linked_count += 1

            # Update profile school to match canonical name if slightly different
            if u.profile.school != canonical.name:
                u.profile.school = canonical.name

        db.commit()
        print(f"[migrate_school_members] Successfully linked {linked_count} unlinked students to their canonical school hubs.")

        # Update member counts on schools
        for s in db.query(models.School).all():
            count = db.query(models.SchoolMember).filter(models.SchoolMember.school_id == s.id).count()
            s.members_count = count
        db.commit()
        print("[migrate_school_members] Updated school member counts.")
    except Exception as e:
        db.rollback()
        print(f"[migrate_school_members] Error during migration: {e}", file=sys.stderr)
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
