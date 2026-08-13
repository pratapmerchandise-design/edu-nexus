from app.database import engine
from sqlalchemy import text

def migrate():
    print("Starting migration...")
    with engine.begin() as conn:
        try:
            # Check if columns exist
            conn.execute(text("SELECT last_seen FROM users LIMIT 1"))
            print("Column 'last_seen' already exists, skipping...")
        except Exception:
            print("Adding column 'last_seen'...")
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen DATETIME NULL"))
            print("Migration complete!")

if __name__ == "__main__":
    migrate()
