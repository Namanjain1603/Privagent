import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
import backend.database as db_module
from backend.main import app
from backend.config import settings

# In-memory SQLite database with StaticPool for complete isolation
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session(monkeypatch):
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Mock check_db_connection to verify test_engine connectivity
    def mock_check_db():
        try:
            s = TestingSessionLocal()
            s.execute(text("SELECT 1"))
            s.close()
            return True
        except Exception:
            return False

    monkeypatch.setattr(db_module, "check_db_connection", mock_check_db)
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
