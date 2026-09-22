import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.session import SessionModel, TelemetryModel

router = APIRouter(tags=["Telemetry"])


class TelemetryRequest(BaseModel):
    session_id: str = Field(..., min_length=4, max_length=64)
    request_id: Optional[str] = Field(None, max_length=64)
    tab_id: Optional[int] = Field(None)
    event_type: str = Field(..., max_length=64)
    component: str = Field("CHROME_EXTENSION", max_length=64)
    action_type: Optional[str] = Field(None, max_length=32)
    execution_time_ms: float = Field(0.0, ge=0.0)
    success: bool = True
    details: Dict[str, Any] = Field(default_factory=dict)


class TelemetryResponse(BaseModel):
    status: str = "RECORDED"
    telemetry_id: int
    session_id: str
    timestamp: str


def sanitize_payload(data: Any) -> Any:
    sensitive_keywords = ["password", "passwd", "otp", "pin", "card", "secret", "cvv", "token", "auth", "aadhaar", "pan", "credential"]
    
    if isinstance(data, dict):
        # 1. Any TYPE action or explicit value field must NEVER persist raw user input
        if data.get("type") == "TYPE" or data.get("action_type") == "TYPE":
            if "value" in data:
                data["value_present"] = bool(data["value"])
                del data["value"]
            if "val" in data:
                data["value_present"] = bool(data["val"])
                del data["val"]
            if "text" in data:
                data["value_present"] = bool(data["text"])
                del data["text"]
                
        sanitized_dict = {}
        for k, v in data.items():
            lower_k = k.lower()
            if any(sk in lower_k for sk in sensitive_keywords):
                sanitized_dict[k] = "[MASKED_BY_M5]"
            else:
                sanitized_dict[k] = sanitize_payload(v)
        return sanitized_dict
    elif isinstance(data, list):
        return [sanitize_payload(item) for item in data]
    else:
        return data


@router.post("/telemetry", response_model=TelemetryResponse, status_code=status.HTTP_200_OK)
def record_telemetry(payload: TelemetryRequest, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.session_id == payload.session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    try:
        safe_details = sanitize_payload(dict(payload.details))
    except Exception:
        safe_details = {"error": "SANITIZATION_FAILED_CLOSED"}

    tele = TelemetryModel(
        session_id=payload.session_id,
        request_id=payload.request_id,
        tab_id=payload.tab_id,
        event_type=payload.event_type,
        component=payload.component,
        action_type=payload.action_type,
        execution_time_ms=payload.execution_time_ms,
        success=payload.success,
        details_json=json.dumps(safe_details),
        timestamp=datetime.utcnow()
    )
    db.add(tele)
    db.commit()
    db.refresh(tele)

    return TelemetryResponse(
        status="RECORDED",
        telemetry_id=tele.id,
        session_id=payload.session_id,
        timestamp=tele.timestamp.isoformat()
    )


# --- M6 Aggregator Schemas ---
class BrowserActionLogSchema(BaseModel):
    id: str
    stepNumber: int
    action: str
    selector: str
    sanitizedValue: Optional[str] = None
    timestamp: str
    validated: bool
    validationError: Optional[str] = None
    durationMs: float

class LatencyBreakdownSchema(BaseModel):
    domCaptureMs: float = 0.0
    ocrVisionMs: float = 0.0
    piiDetectionMs: float = 0.0
    localRedactionMs: float = 0.0
    backendNetworkMs: float = 0.0
    cloudReasoningMs: float = 0.0
    actionValidationMs: float = 0.0
    browserExecutionMs: float = 0.0
    totalEndToEndMs: float = 0.0

class ClientResourceUsageSchema(BaseModel):
    cpuUsagePct: float = 0.0
    memoryUsageMb: float = 0.0
    gpuActive: bool = False
    modelVramMb: Optional[float] = None

class M6TelemetryPayload(BaseModel):
    sessionId: str
    timestamp: str
    url: str
    pageTitle: str
    privacyStatus: str
    piiDetectedCount: int
    piiRedactedCount: int
    rawPiiSentToCloud: int = 0
    currentSessionStatus: str
    recentActions: List[BrowserActionLogSchema]
    detectedPiiList: list = [] 
    latency: LatencyBreakdownSchema
    clientResources: ClientResourceUsageSchema
    isSimulatedDemoData: bool = False


@router.get("/telemetry/session/{session_id}", response_model=M6TelemetryPayload, status_code=status.HTTP_200_OK)
def get_session_telemetry_aggregate(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    events = db.query(TelemetryModel).filter(TelemetryModel.session_id == session_id).order_by(TelemetryModel.id.asc()).all()
    
    recent_actions = []
    url = "unknown"
    page_title = "unknown"
    cloud_reasoning_ms = 0.0
    browser_exec_ms = 0.0

    step_number = 1
    for ev in events:
        try:
            raw_details = json.loads(ev.details_json)
        except Exception:
            raw_details = {}
            
        safe_details = sanitize_payload(raw_details)

        if ev.event_type == "DOM_RESPONSE":
            url = safe_details.get("url") or safe_details.get("page_url") or url
            page_title = safe_details.get("page_title") or safe_details.get("title") or page_title

        if ev.component == "M1":
            cloud_reasoning_ms += ev.execution_time_ms
        elif ev.component == "CHROME_EXTENSION" and ev.event_type == "ACTION_RESULT":
            browser_exec_ms += ev.execution_time_ms

        if ev.event_type == "ACTION_RESULT":
            action_data = safe_details.get("action", {})
            action_type = ev.action_type or action_data.get("type", "UNKNOWN")
            selector = safe_details.get("target") or action_data.get("target", "unknown")
            validation_error = safe_details.get("error") if not ev.success else None
            
            recent_actions.append(BrowserActionLogSchema(
                id=ev.request_id or str(ev.id),
                stepNumber=step_number,
                action=action_type,
                selector=selector,
                sanitizedValue=None,
                timestamp=ev.timestamp.isoformat() + "Z",
                validated=ev.success,
                validationError=validation_error,
                durationMs=ev.execution_time_ms
            ))
            step_number += 1
            
    m5_status_to_m6 = {
        "CREATED": "IDLE",
        "ACTIVE": "ACTIVE",
        "COMPLETED": "COMPLETED",
        "FAILED": "FAILED"
    }

    return M6TelemetryPayload(
        sessionId=sess.session_id,
        timestamp=sess.updated_at.isoformat() + "Z",
        url=url,
        pageTitle=page_title,
        privacyStatus="PROTECTED",
        piiDetectedCount=sess.redacted_token_count,
        piiRedactedCount=sess.redacted_token_count,
        rawPiiSentToCloud=0,
        currentSessionStatus=m5_status_to_m6.get(sess.status, "IDLE"),
        recentActions=recent_actions,
        detectedPiiList=[],
        latency=LatencyBreakdownSchema(
            cloudReasoningMs=cloud_reasoning_ms,
            browserExecutionMs=browser_exec_ms,
            totalEndToEndMs=cloud_reasoning_ms + browser_exec_ms
        ),
        clientResources=ClientResourceUsageSchema(),
        isSimulatedDemoData=False
    )
