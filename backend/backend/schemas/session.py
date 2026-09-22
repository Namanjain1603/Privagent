import re
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class SessionStatus(str, Enum):
    CREATED = "CREATED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class WorkflowStatus(str, Enum):
    IDLE = "IDLE"
    RECEIVING_CONTEXT = "RECEIVING_CONTEXT"
    AI_REASONING = "AI_REASONING"
    VALIDATING = "VALIDATING"
    READY_FOR_EXECUTION = "READY_FOR_EXECUTION"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class CreateSessionRequest(BaseModel):
    session_id: Optional[str] = Field(None, min_length=4, max_length=64)
    user_task: str = Field(..., min_length=1, max_length=1000)

    @field_validator("session_id")
    @classmethod
    def validate_session_id_chars(cls, v: Optional[str]) -> Optional[str]:
        if v:
            if not re.match(r"^[a-zA-Z0-9_\-]+$", v):
                raise ValueError("SESSION_ID_INVALID: Only alphanumeric characters, hyphens, and underscores are allowed.")
        return v


class SessionResponse(BaseModel):
    session_id: str
    status: str
    workflow_status: str
    created_at: str
    updated_at: str
    action_count: int
    error_count: int
    redacted_token_count: int
    user_task: str
    metadata: Dict[str, Any] = {}
