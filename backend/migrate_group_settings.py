from app.database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE conversations ADD COLUMN only_admins_can_message BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("Successfully added only_admins_can_message column.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Column only_admins_can_message already exists.")
            else:
                print(f"Error: {e}")

if __name__ == '__main__':
    run()
