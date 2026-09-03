from backend.app.database import engine
from sqlalchemy import text

def migrate():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN is_poll BOOLEAN DEFAULT FALSE"))
            print("Added is_poll")
        except Exception as e:
            print("Error or already exists:", e)
            
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN poll_multiple_answers BOOLEAN DEFAULT FALSE"))
            print("Added poll_multiple_answers")
        except Exception as e:
            print("Error or already exists:", e)

if __name__ == '__main__':
    migrate()
