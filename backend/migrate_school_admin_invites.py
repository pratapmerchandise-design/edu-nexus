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
        # Check dialect
        dialect_name = engine.dialect.name
        
        # Get existing columns
        existing_cols = []
        if dialect_name == "sqlite":
            res = conn.execute(text("PRAGMA table_info(school_invitations)"))
            existing_cols = [row[1] for row in res.fetchall()]
        else:
            res = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'school_invitations'
            """))
            existing_cols = [row[0] for row in res.fetchall()]

        print(f"[migrate_school_admin_invites] Existing columns: {existing_cols}")

        # Add email if missing
        if "email" not in existing_cols:
            try:
                if dialect_name == "sqlite":
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN email VARCHAR(255)"))
                else:
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN email VARCHAR(255) NULL"))
                conn.commit()
                print("[migrate_school_admin_invites] Added 'email' column")
            except Exception as e:
                print(f"[migrate_school_admin_invites] Error adding email: {e}")

        # Add token if missing
        if "token" not in existing_cols:
            try:
                if dialect_name == "sqlite":
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN token VARCHAR(64)"))
                else:
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN token VARCHAR(64) NULL"))
                conn.commit()
                print("[migrate_school_admin_invites] Added 'token' column")
            except Exception as e:
                print(f"[migrate_school_admin_invites] Error adding token: {e}")

        # Add expires_at if missing
        if "expires_at" not in existing_cols:
            try:
                if dialect_name == "sqlite":
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN expires_at DATETIME"))
                else:
                    conn.execute(text("ALTER TABLE school_invitations ADD COLUMN expires_at DATETIME NULL"))
                conn.commit()
                print("[migrate_school_admin_invites] Added 'expires_at' column")
            except Exception as e:
                print(f"[migrate_school_admin_invites] Error adding expires_at: {e}")

    print("[migrate_school_admin_invites] Migration completed successfully.")

if __name__ == "__main__":
    run()
