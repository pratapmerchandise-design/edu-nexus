import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Automatically load backend/.env if present
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip().strip('"\'')

# MySQL configuration options from environment or backend/.env
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "edu_nexus")

# Default MySQL Connection String
DEFAULT_MYSQL_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

# Allow custom DATABASE_URL override if provided
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_MYSQL_URL)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
    with engine.connect() as conn:
        print(f"[Database] Successfully connected to MySQL database: {DATABASE_URL.split('@')[-1]}")
except Exception as e:
    print(f"[Database] MySQL connection attempt failed: {e}")
    print("[Database] Falling back to SQLite local database (edu_nexus.db) for instant execution.")
    DATABASE_URL = "sqlite:///./edu_nexus.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
