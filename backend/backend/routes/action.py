from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.session import SessionModel, AuditEventModel
from backend.schemas.action import Action, ActionPlan, ActionValidateRequest, ActionValidateResponse
from backend.schemas.page import AnalyzeRequest, AnalyzeResponse
from backend.services.validator import ActionValidatorService
from backend.services.ai_service import AIService

router = APIRouter(tags=["Actions & Planning"])


class PlanRequest(BaseModel):
    session_id: str = Field(..., min_length=4, max_length=64)
    user_goal: str = Field(..., min_length=1, max_length=1000)
    current_url: str = Field(..., max_length=500)
    sanitized_elements: List[Dict[str, Any]] = Field(default_factory=list, max_length=100)


class PlanResponse(BaseModel):
    status: str = "SUCCESS"
    session_id: str
    action_plan: ActionPlan
    validation_status: str = "ALL_ACTIONS_APPROVED"


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_page_context(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.session_id == payload.session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    if not payload.sanitized_context.redaction_verified:
        raise HTTPException(
            status_code=400,
            detail="PRIVACY_BOUNDARY_VIOLATION: Context was not certified by M2 On-Device Privacy Guard."
        )

    sess.workflow_status = "RECEIVING_CONTEXT"
    sess.redacted_token_count += payload.sanitized_context.redacted_token_count
    sess.updated_at = datetime.utcnow()
    db.commit()

    return AnalyzeResponse(
        status="ACCEPTED",
        session_id=payload.session_id,
        sanitized_element_count=len(payload.sanitized_context.sanitized_elements),
        privacy_verified=payload.sanitized_context.redaction_verified,
        summary=f"Context accepted and verified safe with {len(payload.sanitized_context.sanitized_elements)} interactive DOM elements.",
        server_timestamp=datetime.utcnow().isoformat() + "Z"
    )


@router.post("/plan", response_model=PlanResponse)
def generate_action_plan(payload: PlanRequest, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.session_id == payload.session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    if sess.status in ["COMPLETED", "FAILED"]:
        raise HTTPException(
            status_code=400,
            detail=f"INVALID_SESSION_STATE: Cannot generate actions on a {sess.status} session."
        )

    sess.workflow_status = "AI_REASONING"
    db.commit()

    try:
        plan = AIService.generate_plan(
            session_id=payload.session_id,
            user_goal=payload.user_goal,
            current_url=payload.current_url,
            sanitized_elements=payload.sanitized_elements
        )
    except Exception as e:
        sess.error_count += 1
        db.commit()
        raise HTTPException(status_code=400, detail=str(e))

    sess.workflow_status = "READY_FOR_EXECUTION"
    sess.updated_at = datetime.utcnow()
    db.commit()

    return PlanResponse(
        status="SUCCESS",
        session_id=payload.session_id,
        action_plan=plan,
        validation_status="ALL_ACTIONS_APPROVED"
    )


@router.post("/validate-action", response_model=ActionValidateResponse)
def validate_single_action(payload: ActionValidateRequest, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.session_id == payload.session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    act = payload.action
    if isinstance(act, dict):
        act_type = str(act.get("type", "UNKNOWN"))
        target = str(act.get("target", ""))
    elif hasattr(act, "type"):
        act_type = act.type.value if hasattr(act.type, "value") else str(act.type)
        target = str(getattr(act, "target", ""))
    else:
        act_type = "UNKNOWN"
        target = ""

    is_safe, reason = ActionValidatorService.validate_action(payload.action)

    if not is_safe:
        audit = AuditEventModel(
            session_id=payload.session_id,
            event_type="VALIDATION_REJECTED",
            category="SECURITY_AUDIT",
            action_type=act_type,
            reason=reason
        )
        db.add(audit)
        sess.error_count += 1
        db.commit()
    else:
        sess.action_count += 1
        db.commit()

    return ActionValidateResponse(
        is_safe=is_safe,
        rejection_reason=reason,
        action_type=act_type,
        validated_target=target
    )
