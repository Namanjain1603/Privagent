import json
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text
from backend.database import Base


class SessionModel(Base):
    __tablename__ = "sessions"

    session_id = Column(String(64), primary_key=True, index=True)
    status = Column(String(32), default="CREATED", nullable=False)
    workflow_status = Column(String(32), default="IDLE", nullable=False)
    user_task = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    action_count = Column(Integer, default=0, nullable=False)
    error_count = Column(Integer, default=0, nullable=False)
    redacted_token_count = Column(Integer, default=0, nullable=False)
    metadata_json = Column(Text, default="{}", nullable=False)


class TelemetryModel(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), index=True, nullable=False)
    request_id = Column(String(64), index=True, nullable=True)
    tab_id = Column(Integer, index=True, nullable=True)
    event_type = Column(String(64), nullable=False)
    component = Column(String(64), default="CHROME_EXTENSION", nullable=False)
    action_type = Column(String(32), nullable=True)
    execution_time_ms = Column(Float, default=0.0, nullable=False)
    success = Column(Boolean, default=True, nullable=False)
    details_json = Column(Text, default="{}", nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), index=True, nullable=False)
    event_type = Column(String(64), nullable=False)
    category = Column(String(64), default="SECURITY_AUDIT", nullable=False)
    action_type = Column(String(32), nullable=True)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
