from app.database import engine
from sqlalchemy import text

def migrate():
    print("Starting migration...")
    with engine.begin() as conn:
        try:
            # Check if columns exist
            conn.execute(text("SELECT status FROM conversations LIMIT 1"))
            print("Columns already exist, skipping...")
        except Exception:
            print("Adding columns...")
            conn.execute(text("ALTER TABLE conversations ADD COLUMN status VARCHAR(30) DEFAULT 'accepted'"))
            conn.execute(text("ALTER TABLE conversations ADD COLUMN initiator_id INT NULL"))
            conn.execute(text("ALTER TABLE conversations ADD CONSTRAINT fk_conversations_initiator FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE CASCADE"))
            
            # For existing conversations, we'll try to set the initiator to the sender of the first message
            conn.execute(text("""
                UPDATE conversations c
                JOIN (
                    SELECT conversation_id, MIN(id) as first_msg_id, sender_id
                    FROM messages
                    GROUP BY conversation_id
                ) m ON c.id = m.conversation_id
                SET c.initiator_id = m.sender_id
            """))
            print("Migration complete!")

if __name__ == "__main__":
    migrate()
