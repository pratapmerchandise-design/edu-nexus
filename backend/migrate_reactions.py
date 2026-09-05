"""Create reaction tables for messages, posts, and comments.

Safe to re-run: detects existing tables and skips. Works on MySQL and SQLite.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect
from backend.app.database import engine, Base
from backend.app.models import MessageReaction, PostReaction, CommentReaction


def run():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    print(f"[Migration] Existing tables: {len(existing_tables)} found.")

    target_tables = [
        MessageReaction.__table__,
        PostReaction.__table__,
        CommentReaction.__table__,
    ]

    for table in target_tables:
        if table.name in existing_tables:
            print(f"[Migration] Table '{table.name}' already exists.")
        else:
            print(f"[Migration] Creating table '{table.name}'...")
            Base.metadata.create_all(bind=engine, tables=[table])
            print(f"[Migration] Table '{table.name}' created successfully.")

    print("[Migration] Reaction tables migration complete.")


if __name__ == "__main__":
    run()
