import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

# Ensure data directory exists if sqlite
if settings.DATABASE_URL.startswith("sqlite"):
    from backend.app.core.config import _DEFAULT_DB_PATH
    absolute_db_url = f"sqlite:///{_DEFAULT_DB_PATH}"
    os.makedirs(os.path.dirname(_DEFAULT_DB_PATH), exist_ok=True)
    engine = create_engine(
        absolute_db_url,
        connect_args={"check_same_thread": False}
    )

    # Enable foreign keys for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

