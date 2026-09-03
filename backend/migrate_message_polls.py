import sqlite3

def run_migration():
    conn = sqlite3.connect('../edu_nexus.db')
    c = conn.cursor()

    print("Adding columns to messages table...")
    try:
        c.execute("ALTER TABLE messages ADD COLUMN is_poll BOOLEAN DEFAULT 0")
        c.execute("ALTER TABLE messages ADD COLUMN poll_multiple_answers BOOLEAN DEFAULT 0")
    except sqlite3.OperationalError as e:
        print(f"Column might already exist: {e}")

    print("Creating message_poll_options table...")
    c.execute("""
    CREATE TABLE IF NOT EXISTS message_poll_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        option_text VARCHAR(200) NOT NULL,
        FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
    """)

    print("Creating message_poll_votes table...")
    c.execute("""
    CREATE TABLE IF NOT EXISTS message_poll_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_option_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY(poll_option_id) REFERENCES message_poll_options(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == '__main__':
    run_migration()
