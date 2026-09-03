from app.database import engine
from sqlalchemy import text

def migrate():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE messages ADD COLUMN reply_to_id INTEGER REFERENCES messages(id);"))
            conn.commit()
            print("Migration successful: added reply_to_id to messages.")
    except Exception as e:
        print(f"Error (maybe column already exists): {e}")

if __name__ == "__main__":
    migrate()
