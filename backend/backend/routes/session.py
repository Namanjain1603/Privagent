import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.session import SessionModel
from backend.schemas.session import CreateSessionRequest, SessionResponse, SessionStatus, WorkflowStatus

router = APIRouter(tags=["Sessions"])


@router.post("/session", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: CreateSessionRequest, db: Session = Depends(get_db)):
    sid = payload.session_id or f"sess_{uuid.uuid4().hex[:12]}"

    existing = db.query(SessionModel).filter(SessionModel.session_id == sid).first()
    if existing:
        return SessionResponse(
            session_id=existing.session_id,
            status=existing.status,
            workflow_status=existing.workflow_status,
            created_at=existing.created_at.isoformat(),
            updated_at=existing.updated_at.isoformat(),
            action_count=existing.action_count,
            error_count=existing.error_count,
            redacted_token_count=existing.redacted_token_count,
            user_task=existing.user_task
        )

    now = datetime.utcnow()
    new_sess = SessionModel(
        session_id=sid,
        status=SessionStatus.ACTIVE.value,
        workflow_status=WorkflowStatus.IDLE.value,
        user_task=payload.user_task,
        created_at=now,
        updated_at=now,
        action_count=0,
        error_count=0,
        redacted_token_count=0
    )
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)

    return SessionResponse(
        session_id=new_sess.session_id,
        status=new_sess.status,
        workflow_status=new_sess.workflow_status,
        created_at=new_sess.created_at.isoformat(),
        updated_at=new_sess.updated_at.isoformat(),
        action_count=new_sess.action_count,
        error_count=new_sess.error_count,
        redacted_token_count=new_sess.redacted_token_count,
        user_task=new_sess.user_task
    )


@router.get("/session/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SESSION_NOT_FOUND: Session '{session_id}' does not exist."
        )

    return SessionResponse(
        session_id=sess.session_id,
        status=sess.status,
        workflow_status=sess.workflow_status,
        created_at=sess.created_at.isoformat(),
        updated_at=sess.updated_at.isoformat(),
        action_count=sess.action_count,
        error_count=sess.error_count,
        redacted_token_count=sess.redacted_token_count,
        user_task=sess.user_task
    )


@router.patch("/session/{session_id}/complete", response_model=SessionResponse)
def complete_session(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    sess.status = SessionStatus.COMPLETED.value
    sess.workflow_status = WorkflowStatus.COMPLETED.value
    sess.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sess)

    return SessionResponse(
        session_id=sess.session_id,
        status=sess.status,
        workflow_status=sess.workflow_status,
        created_at=sess.created_at.isoformat(),
        updated_at=sess.updated_at.isoformat(),
        action_count=sess.action_count,
        error_count=sess.error_count,
        redacted_token_count=sess.redacted_token_count,
        user_task=sess.user_task
    )


@router.patch("/session/{session_id}/fail", response_model=SessionResponse)
def fail_session(session_id: str, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")

    sess.status = SessionStatus.FAILED.value
    sess.workflow_status = WorkflowStatus.FAILED.value
    sess.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sess)

    return SessionResponse(
        session_id=sess.session_id,
        status=sess.status,
        workflow_status=sess.workflow_status,
        created_at=sess.created_at.isoformat(),
        updated_at=sess.updated_at.isoformat(),
        action_count=sess.action_count,
        error_count=sess.error_count,
        redacted_token_count=sess.redacted_token_count,
        user_task=sess.user_task
    )
