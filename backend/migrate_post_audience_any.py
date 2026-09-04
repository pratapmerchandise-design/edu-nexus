"""Add post audience columns if they don't exist yet.

Safe to re-run: detects existing columns and skips. Works on MySQL and SQLite.
"""
from sqlalchemy import text, inspect
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app.database import engine


def run():
    inspector = inspect(engine)
    if 'posts' not in inspector.get_table_names():
        print("posts table does not exist yet; Base.metadata.create_all will create it.")
        return

    existing = {c['name'] for c in inspector.get_columns('posts')}
    stmts = []
    if 'audience' not in existing:
        if engine.dialect.name == 'sqlite':
            stmts.append("ALTER TABLE posts ADD COLUMN audience VARCHAR(20) NOT NULL DEFAULT 'public'")
        else:
            stmts.append("ALTER TABLE posts ADD COLUMN audience VARCHAR(20) NOT NULL DEFAULT 'public'")
    if 'audience_community_id' not in existing:
        if engine.dialect.name == 'sqlite':
            stmts.append("ALTER TABLE posts ADD COLUMN audience_community_id INTEGER NULL")
        else:
            stmts.append("ALTER TABLE posts ADD COLUMN audience_community_id INTEGER NULL")

    if not stmts:
        print("posts audience columns already present. Nothing to do.")
        return

    with engine.begin() as conn:
        for s in stmts:
            print(f"Executing: {s}")
            conn.execute(text(s))
    print("Migrated posts table with audience columns.")


if __name__ == "__main__":
    run()
