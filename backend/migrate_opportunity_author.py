"""
Idempotent migration script to add author_id column to the opportunities table.
Supports MySQL and SQLite.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text
from backend.app.database import engine


def run():
    print("[migrate_opportunity_author] Checking opportunities table schema...")
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    if "opportunities" not in existing_tables:
        print("[migrate_opportunity_author] opportunities table does not exist yet. Skipping.")
        return

    cols = {c["name"] for c in inspector.get_columns("opportunities")}
    if "author_id" in cols:
        print("[migrate_opportunity_author] author_id column already exists on opportunities. Skipping.")
        return

    with engine.begin() as conn:
        dialect = engine.dialect.name
        if dialect == "mysql":
            try:
                conn.execute(text(
                    "ALTER TABLE opportunities ADD COLUMN author_id INT NULL, "
                    "ADD CONSTRAINT fk_opp_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;"
                ))
            except Exception as e:
                # If foreign key fails (e.g. existing constraint), try without FK constraint
                print(f"[migrate_opportunity_author] Note on FK: {e}, adding column without constraint...")
                conn.execute(text("ALTER TABLE opportunities ADD COLUMN author_id INT NULL;"))
        else:
            conn.execute(text("ALTER TABLE opportunities ADD COLUMN author_id INTEGER NULL;"))
        print("[migrate_opportunity_author] Successfully added author_id column to opportunities table.")


if __name__ == "__main__":
    run()
