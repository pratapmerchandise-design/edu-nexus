from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN attachment_url VARCHAR(500)"))
            print("Added attachment_url to messages")
        except Exception as e:
            print(f"Error adding attachment_url: {e}")

        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN attachment_type VARCHAR(50)"))
            print("Added attachment_type to messages")
        except Exception as e:
            print(f"Error adding attachment_type: {e}")
        
        conn.commit()

if __name__ == '__main__':
    migrate()
