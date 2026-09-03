from backend.app.database import engine
from sqlalchemy import text

def migrate():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE"))
            print("Added is_deleted")
        except Exception as e:
            print("Error or already exists:", e)
            
        try:
            conn.execute(text("ALTER TABLE messages ADD COLUMN deleted_by_admin BOOLEAN DEFAULT FALSE"))
            print("Added deleted_by_admin")
        except Exception as e:
            print("Error or already exists:", e)

if __name__ == '__main__':
    migrate()
