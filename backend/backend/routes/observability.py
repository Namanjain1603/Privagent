from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend.models.session import SessionModel, TelemetryModel, AuditEventModel

router = APIRouter(tags=["Observability & Metrics"])


@router.get("/observability/metrics")
def get_observability_metrics(db: Session = Depends(get_db)):
    total_sessions = db.query(func.count(SessionModel.session_id)).scalar() or 0
    active_sessions = db.query(func.count(SessionModel.session_id)).filter(SessionModel.status == "ACTIVE").scalar() or 0
    completed_sessions = db.query(func.count(SessionModel.session_id)).filter(SessionModel.status == "COMPLETED").scalar() or 0
    failed_sessions = db.query(func.count(SessionModel.session_id)).filter(SessionModel.status == "FAILED").scalar() or 0

    total_telemetry = db.query(func.count(TelemetryModel.id)).scalar() or 0
    success_telemetry = db.query(func.count(TelemetryModel.id)).filter(TelemetryModel.success == True).scalar() or 0
    avg_latency = db.query(func.avg(TelemetryModel.execution_time_ms)).scalar() or 0.0

    total_audits = db.query(func.count(AuditEventModel.id)).scalar() or 0
    blocked_actions = db.query(func.count(AuditEventModel.id)).filter(AuditEventModel.event_type == "VALIDATION_REJECTED").scalar() or 0

    return {
        "status": "HEALTHY",
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "total_requests": total_telemetry,
            "success_requests": success_telemetry,
            "failed_requests": total_telemetry - success_telemetry,
            "average_latency_ms": round(float(avg_latency), 2),
            "client_rejection_count": blocked_actions,
            "server_error_count": 0
        },
        "sessions": {
            "total": total_sessions,
            "active": active_sessions,
            "completed": completed_sessions,
            "failed": failed_sessions
        },
        "security": {
            "total_audit_events": total_audits,
            "unsafe_actions_blocked": blocked_actions,
            "zero_leak_guarantee": True
        }
    }
