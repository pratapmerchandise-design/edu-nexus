from app.database import engine
from sqlalchemy import text

def migrate():
    print("Starting migration...")
    with engine.begin() as conn:
        try:
            # Check if columns exist
            conn.execute(text("SELECT is_delivered FROM messages LIMIT 1"))
            print("Column 'is_delivered' already exists, skipping...")
        except Exception:
            print("Adding column 'is_delivered'...")
            conn.execute(text("ALTER TABLE messages ADD COLUMN is_delivered BOOLEAN DEFAULT FALSE"))
            
            # Update all existing messages to be delivered if they are not read, and true if they are read.
            # Actually just set all existing to true so we don't have gray ticks for old messages.
            conn.execute(text("UPDATE messages SET is_delivered = TRUE"))
            print("Migration complete!")

if __name__ == "__main__":
    migrate()
