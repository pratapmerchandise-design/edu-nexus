"""Add new columns to the schools table (district, address, city, state,
country, external_id, verified) and an index on external_id for fast dedup.

Safe to re-run: each column is checked first and only added if missing.
"""
from sqlalchemy import text, inspect
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.app.database import engine


def run():
    inspector = inspect(engine)
    if 'schools' not in inspector.get_table_names():
        print("schools table does not exist; Base.metadata.create_all will create it.")
        return

    existing = {c['name'] for c in inspector.get_columns('schools')}

    # (column_name, ddl_clause)
    additions = [
        ('district',          "ALTER TABLE schools ADD COLUMN district VARCHAR(120) NULL"),
        ('address',           "ALTER TABLE schools ADD COLUMN address VARCHAR(500) NULL"),
        ('city',              "ALTER TABLE schools ADD COLUMN city VARCHAR(120) NULL"),
        ('state',             "ALTER TABLE schools ADD COLUMN state VARCHAR(120) NULL"),
        ('country',           "ALTER TABLE schools ADD COLUMN country VARCHAR(120) NULL DEFAULT 'India'"),
        ('external_id',       "ALTER TABLE schools ADD COLUMN external_id VARCHAR(80) NULL"),
        ('verified',          "ALTER TABLE schools ADD COLUMN verified BOOLEAN NOT NULL DEFAULT 0"),
    ]

    with engine.begin() as conn:
        for col, ddl in additions:
            if col in existing:
                continue
            print(f"Adding column: {col}")
            if engine.dialect.name == 'sqlite':
                # SQLite uses INTEGER for booleans and doesn't support DEFAULT
                # expressions with parens; rewrite the verified column for SQLite.
                if col == 'verified':
                    ddl = "ALTER TABLE schools ADD COLUMN verified BOOLEAN NOT NULL DEFAULT 0"
                if col == 'country':
                    ddl = "ALTER TABLE schools ADD COLUMN country VARCHAR(120) NULL DEFAULT 'India'"
            conn.execute(text(ddl))

        # Indexes
        existing_idx = {i['name'] for i in inspector.get_indexes('schools')}
        for idx_name, col in [('ix_schools_district', 'district'), ('ix_schools_city', 'city'),
                              ('ix_schools_state', 'state'), ('ix_schools_country', 'country'),
                              ('ix_schools_external_id', 'external_id'),
                              ('ix_schools_verified', 'verified')]:
            if idx_name in existing_idx:
                continue
            print(f"Creating index: {idx_name}")
            conn.execute(text(f"CREATE INDEX {idx_name} ON schools ({col})"))

    print("Migration complete.")


if __name__ == "__main__":
    run()
