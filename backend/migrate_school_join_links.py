"""Create the school_join_links table for shareable school join links."""
from backend.app.database import engine, Base, SessionLocal
from backend.app import models


def run():
    models.Base.metadata.create_all(bind=engine)
    print("Ensured 'school_join_links' table exists.")

    # Add the link column only if the table already existed without it.
    with engine.connect() as conn:
        try:
            conn.execute(
                __import__('sqlalchemy').text(
                    "ALTER TABLE school_join_links ADD COLUMN active BOOLEAN DEFAULT TRUE"
                )
            )
            conn.commit()
            print("Added 'active' column.")
        except Exception:
            print("Column 'active' likely already present.")


if __name__ == "__main__":
    run()
