from app.database import engine
from sqlalchemy import text
import create_missing_tables

print("Running group chat migration...")

with engine.begin() as conn:
    try:
        conn.execute(text("ALTER TABLE conversations ADD COLUMN is_group BOOLEAN DEFAULT 0"))
        conn.execute(text("ALTER TABLE conversations ADD COLUMN name VARCHAR(100)"))
        conn.execute(text("ALTER TABLE conversations ADD COLUMN description TEXT"))
        conn.execute(text("ALTER TABLE conversations ADD COLUMN avatar_url VARCHAR(255)"))
        conn.execute(text("ALTER TABLE conversations ADD COLUMN is_public BOOLEAN DEFAULT 0"))
        print("Successfully added group columns to conversations table.")
    except Exception as e:
        print("Note: Columns might already exist in conversations:", e)
    
    try:
        conn.execute(text("ALTER TABLE conversation_members ADD COLUMN role VARCHAR(30) DEFAULT 'member'"))
        print("Successfully added role column to conversation_members table.")
    except Exception as e:
        print("Note: Role column might already exist:", e)

print("Migration complete.")
