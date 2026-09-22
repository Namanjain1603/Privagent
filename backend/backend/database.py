from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False,
        "timeout": 15.0
    }

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=15000;")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Executes a lightweight query to verify active database connectivity."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        db.close()


def init_db():
    from backend.models.session import SessionModel, TelemetryModel, AuditEventModel
    Base.metadata.create_all(bind=engine)
    
    # Safe migrations for existing SQLite databases
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE telemetry ADD COLUMN request_id VARCHAR(64)"))
        except Exception:
            pass # Column already exists
            
        try:
            conn.execute(text("ALTER TABLE telemetry ADD COLUMN tab_id INTEGER"))
        except Exception:
            pass # Column already exists
        conn.commit()

