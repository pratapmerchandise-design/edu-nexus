"""Add status column to follows table if not present.

Safe to re-run: detects existing column and skips. Works on MySQL and SQLite.
Existing rows are safely updated to status = 'accepted'.
"""
from sqlalchemy import text, inspect
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app.database import engine


def run():
    inspector = inspect(engine)
    if 'follows' not in inspector.get_table_names():
        print("follows table does not exist yet; Base.metadata.create_all will create it.")
        return

    existing = {c['name'] for c in inspector.get_columns('follows')}
    if 'status' not in existing:
        print("Adding status column to follows table...")
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE follows ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'accepted'"))
            conn.execute(text("UPDATE follows SET status = 'accepted' WHERE status IS NULL OR status = ''"))
        print("Migrated follows table with status column.")
    else:
        # Ensure any rows with NULL or empty status are set to 'accepted'
        with engine.begin() as conn:
            conn.execute(text("UPDATE follows SET status = 'accepted' WHERE status IS NULL OR status = ''"))
        print("follows status column already present.")


if __name__ == "__main__":
    run()
