from enum import Enum
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict


class ActionType(str, Enum):
    CLICK = "CLICK"
    TYPE = "TYPE"
    SELECT = "SELECT"
    SCROLL = "SCROLL"
    NAVIGATE = "NAVIGATE"


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: ActionType
    target: Optional[str] = Field(None, max_length=250)
    value: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=200)
    direction: Optional[str] = Field(None, max_length=20)
    amount: Optional[int] = Field(None)


class ActionPlan(BaseModel):
    plan_id: str
    session_id: str
    actions: List[Action] = Field(default_factory=list, max_length=10)
    total_actions: int = 0
    confidence: float = Field(0.95, ge=0.0, le=1.0)
    reasoning_summary: Optional[str] = None


class ActionValidateRequest(BaseModel):
    session_id: str = Field(..., min_length=4, max_length=64)
    action: Union[Action, Dict[str, Any]]


class ActionValidateResponse(BaseModel):
    is_safe: bool
    rejection_reason: Optional[str] = None
    action_type: str
    validated_target: str

