import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import engine, Base
from backend.app import models

def run():
    print("[migrate_school_admin_invites] Ensuring school_invitations table and columns exist...")
    
    # 1. Create table if missing
    try:
        models.SchoolInvitation.__table__.create(bind=engine, checkfirst=True)
    except Exception as e:
        print(f"[migrate_school_admin_invites] Table check note: {e}")

    with engine.connect() as conn:
        dialect_name = engine.dialect.name
        print(f"[migrate_school_admin_invites] Detected database dialect: {dialect_name}")

        if dialect_name == "sqlite":
            res = conn.execute(text("PRAGMA table_info(school_invitations)")).fetchall()
            existing_cols = {row[1]: row for row in res}
            print(f"[migrate_school_admin_invites] SQLite columns: {list(existing_cols.keys())}")

            # Check if user_id has NOT NULL constraint (row[3] == 1) or if new columns missing
            user_id_info = existing_cols.get("user_id")
            user_id_is_not_null = user_id_info and user_id_info[3] == 1
            missing_cols = [col for col in ["email", "token", "expires_at"] if col not in existing_cols]

            if user_id_is_not_null or missing_cols:
                print(f"[migrate_school_admin_invites] Recreating SQLite school_invitations table (user_id NOT NULL: {user_id_is_not_null}, missing: {missing_cols})...")
                try:
                    conn.execute(text("PRAGMA foreign_keys=OFF;"))

                    # Create temporary table with user_id NULL and all columns
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS school_invitations_tmp_v2 (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            school_id INTEGER NOT NULL,
                            user_id INTEGER,
                            email VARCHAR(255),
                            invited_by_id INTEGER,
                            role VARCHAR(50) NOT NULL DEFAULT 'admin',
                            status VARCHAR(30) DEFAULT 'pending',
                            token VARCHAR(64),
                            expires_at DATETIME,
                            created_at DATETIME
                        );
                    """))

                    # Copy whatever columns exist in the current table
                    all_desired = ["id", "school_id", "user_id", "email", "invited_by_id", "role", "status", "token", "expires_at", "created_at"]
                    common_cols = [c for c in all_desired if c in existing_cols]
                    cols_str = ", ".join(common_cols)

                    conn.execute(text(f"""
                        INSERT INTO school_invitations_tmp_v2 ({cols_str})
                        SELECT {cols_str} FROM school_invitations;
                    """))

                    conn.execute(text("DROP TABLE school_invitations;"))
                    conn.execute(text("ALTER TABLE school_invitations_tmp_v2 RENAME TO school_invitations;"))

                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_school_invitations_token ON school_invitations(token);"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_school_invitations_email ON school_invitations(email);"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_school_invitations_id ON school_invitations(id);"))
                    conn.execute(text("PRAGMA foreign_keys=ON;"))
                    conn.commit()
                    print("[migrate_school_admin_invites] SQLite school_invitations table recreated successfully with nullable user_id.")
                except Exception as e:
                    print(f"[migrate_school_admin_invites] SQLite migration error: {e}")
                    conn.rollback()

        elif dialect_name == "mysql":
            # 1. Modify user_id to allow NULL
            try:
                conn.execute(text("ALTER TABLE school_invitations MODIFY COLUMN user_id INT NULL;"))
                conn.commit()
                print("[migrate_school_admin_invites] MySQL user_id modified to allow NULL.")
            except Exception as e:
                print(f"[migrate_school_admin_invites] MySQL modify user_id note: {e}")

            # 2. Check existing columns
            res = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'school_invitations'
            """))
            existing_cols = [row[0] for row in res.fetchall()]

            if "email" not in existing_cols:
                try:
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN email VARCHAR(255) NULL;"))
                    conn.commit()
                except Exception as e:
                    print(f"[migrate_school_admin_invites] Note adding email: {e}")

            if "token" not in existing_cols:
                try:
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN token VARCHAR(64) NULL;"))
                    conn.commit()
                except Exception as e:
                    print(f"[migrate_school_admin_invites] Note adding token: {e}")

            if "expires_at" not in existing_cols:
                try:
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN expires_at DATETIME NULL;"))
                    conn.commit()
                except Exception as e:
                    print(f"[migrate_school_admin_invites] Note adding expires_at: {e}")

        elif dialect_name == "postgresql":
            try:
                conn.execute(text("ALTER TABLE school_invitations ALTER COLUMN user_id DROP NOT NULL;"))
                conn.commit()
            except Exception as e:
                print(f"[migrate_school_admin_invites] PostgreSQL alter user_id note: {e}")

    print("[migrate_school_admin_invites] Migration completed successfully.")

if __name__ == "__main__":
    run()
