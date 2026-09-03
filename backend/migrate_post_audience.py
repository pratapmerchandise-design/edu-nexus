"""Add post audience columns to the existing posts table.

create_all() only creates missing tables, not missing columns, so existing
databases need this one-time migration. Safe to re-run (checks first).
"""
from sqlalchemy import text, inspect
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app.database import engine


def run():
    inspector = inspect(engine)
    existing = set(c['name'] for c in inspector.get_columns('posts'))
    cols = []
    if 'audience' not in existing:
        cols.append("ADD COLUMN audience VARCHAR(20) NOT NULL DEFAULT 'public'")
    if 'audience_community_id' not in existing:
        cols.append("ADD COLUMN audience_community_id INTEGER NULL")

    if not cols:
        print("posts audience columns already present. Nothing to do.")
        return

    with engine.begin() as conn:
        if engine.dialect.name == 'mysql':
            for c in cols:
                conn.execute(text(f"ALTER TABLE posts {c}"))
        else:
            conn.execute(text(f"ALTER TABLE posts {', '.join(cols)}"))
    print("Migrated posts table with audience columns.")


if __name__ == "__main__":
    run()
