"""Seed the schools table with a deduplicated, verified list of campuses.

Usage:
    python -m backend.scripts.seed_schools path/to/schools.json

Or importable: from backend.scripts.seed_schools import seed_from_file

The seeder is idempotent: re-running on the same JSON will not create
duplicates. It matches on external_id first, then on normalized name.
"""
import json
import os
import re
import sys
from typing import Iterable

# Allow running as a standalone script: `python backend/scripts/seed_schools.py`
if __package__ in (None, ""):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.database import SessionLocal  # noqa: E402
from backend.app.models import School, SchoolMember  # noqa: E402


def _normalize(name: str) -> str:
    if not name:
        return ""
    n = name.lower()
    n = re.sub(r"[^a-z0-9]+", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def seed_from_dict(records: Iterable[dict], commit_every: int = 200) -> dict:
    """Insert or update schools from a list of dicts.

    Each record is expected to have at least `name`. Optional fields:
    `id` (external source id), `district`, `address`, `city`, `state`,
    `country`, `phone`, `udise`, `level`, `gender`, `shift`, `description`.

    Returns a small stats dict with created/updated/skipped counts.
    """
    created = 0
    updated = 0
    skipped = 0
    promoted = 0

    db = SessionLocal()
    try:
        # Load all existing schools into memory for O(1) dedup lookups.
        existing = db.query(School).all()
        by_external = {s.external_id: s for s in existing if s.external_id}
        by_name = {}
        for s in existing:
            key = _normalize(s.name)
            if key and key not in by_name:
                by_name[key] = s

        for rec in records:
            name = (rec.get("name") or "").strip()
            if not name:
                skipped += 1
                continue

            external_id = str(rec.get("id") or rec.get("udise") or rec.get("external_id") or "").strip() or None
            norm = _normalize(name)

            # Find the canonical record
            target = None
            if external_id and external_id in by_external:
                target = by_external[external_id]
            elif norm in by_name:
                target = by_name[norm]

            if target is None:
                target = School(name=name, verified=True)
                db.add(target)
                created += 1
            else:
                # Update fields if the seed record has more data.
                changed = False
                if not target.district and rec.get("district"):
                    target.district = rec["district"]; changed = True
                if not target.address and rec.get("address"):
                    target.address = rec["address"]; changed = True
                if not target.city and rec.get("city"):
                    target.city = rec["city"]; changed = True
                if not target.state and rec.get("state"):
                    target.state = rec["state"]; changed = True
                if not target.country:
                    target.country = rec.get("country") or "India"; changed = True
                if not target.external_id and external_id:
                    target.external_id = external_id; changed = True
                if not target.verified:
                    target.verified = True; changed = True
                if changed:
                    updated += 1
                else:
                    skipped += 1

            # Refresh indexes for the just-created record
            if target.id is None:
                db.flush()
            if external_id:
                by_external[external_id] = target
            if norm:
                by_name.setdefault(norm, target)

            if (created + updated) % commit_every == 0:
                db.commit()

        # Mark any pre-existing school rows that match a seeded record (by
        # external_id or normalized name) as verified=True. The new column
        # defaults to 0 for rows created before the migration, so this is a
        # one-time reconciliation pass.
        normalized_names = {_normalize(r.get("name") or "") for r in records if r.get("name")}
        normalized_names.discard("")
        external_ids = {str(r.get("id") or r.get("udise") or r.get("external_id") or "").strip()
                        for r in records if r.get("id") or r.get("udise") or r.get("external_id")}
        external_ids.discard("")
        promoted = 0
        for s in db.query(School).filter(School.verified == False).all():
            if s.external_id and s.external_id in external_ids:
                s.verified = True
                promoted += 1
                continue
            if _normalize(s.name) in normalized_names:
                s.verified = True
                promoted += 1
        if promoted:
            db.commit()

        db.commit()
    finally:
        db.close()

    return {"created": created, "updated": updated, "skipped": skipped, "promoted": promoted}


def seed_from_file(path: str) -> dict:
    with open(path, "r", encoding="utf-8-sig") as f:
        records = json.load(f)
    if not isinstance(records, list):
        raise ValueError(f"Expected JSON array in {path}")
    return seed_from_dict(records)


def dedup_existing() -> dict:
    """Merge any pre-existing duplicate schools (same normalized name) into
    one canonical row. The kept row absorbs SchoolMember memberships from the
    duplicates and the duplicates are deleted. Safe to run repeatedly.
    """
    import sys as _sys
    if _sys.version_info >= (3, 9):
        from collections import defaultdict
    else:
        from collections import defaultdict

    db = SessionLocal()
    try:
        schools = db.query(School).order_by(School.id.asc()).all()
        groups = defaultdict(list)
        for s in schools:
            norm = _normalize(s.name)
            if norm:
                groups[norm].append(s)
            else:
                groups[f"__id_{s.id}"].append(s)

        merged_groups = 0
        deleted_rows = 0
        moved_members = 0
        for norm, rows in groups.items():
            if len(rows) <= 1:
                continue
            # Prefer verified (seeded) row as the canonical one
            rows.sort(key=lambda s: (not s.verified, s.id))
            keep = rows[0]
            extras = rows[1:]

            for dup in extras:
                # Move members to the kept row
                for m in db.query(SchoolMember).filter_by(school_id=dup.id).all():
                    existing = db.query(SchoolMember).filter_by(school_id=keep.id, user_id=m.user_id).first()
                    if existing:
                        db.delete(m)
                        continue
                    m.school_id = keep.id
                    moved_members += 1
                db.flush()
                db.delete(dup)
                deleted_rows += 1
            # Backfill any missing fields on the kept row
            for dup in extras:
                if not keep.district and dup.district: keep.district = dup.district
                if not keep.address and dup.address: keep.address = dup.address
                if not keep.city and dup.city: keep.city = dup.city
                if not keep.state and dup.state: keep.state = dup.state
                if not keep.country and dup.country: keep.country = dup.country
                if not keep.external_id and dup.external_id: keep.external_id = dup.external_id
            merged_groups += 1
        db.commit()
        return {"merged_groups": merged_groups, "deleted_rows": deleted_rows, "moved_members": moved_members}
    finally:
        db.close()


def promote_all_existing() -> int:
    """Mark every existing school row as verified=True.

    One-time helper used to backfill the new `verified` column for databases
    that already had schools before the column was added. After this runs,
    only newly-seeded or admin-created schools default to verified=False.
    """
    db = SessionLocal()
    try:
        promoted = db.query(School).filter(School.verified == False).update(
            {School.verified: True}, synchronize_session=False
        )
        db.commit()
        return promoted
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m backend.scripts.seed_schools <path/to/schools.json>")
        sys.exit(1)
    path = sys.argv[1]
    print(f"Seeding schools from {path} ...")
    stats = seed_from_file(path)
    print(f"Seed: {stats}")
    print("Deduping pre-existing duplicate schools ...")
    dedup_stats = dedup_existing()
    print(f"Dedup: {dedup_stats}")
