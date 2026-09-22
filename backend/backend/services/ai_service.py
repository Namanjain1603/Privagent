import os
import json
import uuid
import logging
from typing import List, Dict, Any
from backend.config import settings
from backend.schemas.action import Action, ActionType, ActionPlan
from backend.services.validator import ActionValidatorService
from backend.services.m1_client import M1Client, M1ClientError

logger = logging.getLogger(__name__)

class AIService:
    _idempotency_cache: Dict[str, ActionPlan] = {}

    @classmethod
    def generate_plan(cls, session_id: str, user_goal: str, current_url: str, sanitized_elements: List[Dict[str, Any]]) -> ActionPlan:
        cache_key = f"{session_id}:{user_goal}:{current_url}"
        if cache_key in cls._idempotency_cache:
            return cls._idempotency_cache[cache_key]

        try:
            m1_response = M1Client.generate_plan(
                session_id=session_id,
                instruction=user_goal,
                url=current_url,
                title="Unknown", # We rely on URL and elements primarily
                elements=sanitized_elements
            )
        except M1ClientError as e:
            # Pass the structured error up to the router
            raise ValueError(str(e))
            
        actions_list = []
        for a in m1_response.get("actions", []):
            try:
                act_type = str(a.get("type")).upper()
                actions_list.append(Action(
                    type=ActionType(act_type),
                    target=str(a.get("target") or a.get("url")) if (a.get("target") or a.get("url")) is not None else None,
                    value=str(a["value"]) if a.get("value") is not None else None,
                    description=str(a.get("description", "")),
                    direction=str(a.get("direction")) if a.get("direction") is not None else None,
                    amount=int(a.get("amount")) if a.get("amount") is not None else None
                ))
            except Exception as e:
                logger.warning(f"Failed to parse action from M1: {e}")
                continue

        is_safe, validated_actions, rejections, err_code = ActionValidatorService.validate_action_plan(actions_list)
        if not is_safe:
            raise ValueError(f"AI_ACTION_VALIDATION_FAILED: {rejections}")

        plan = ActionPlan(
            plan_id=f"plan_{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            actions=validated_actions,
            total_actions=len(validated_actions),
            confidence=0.96,
            reasoning_summary=m1_response.get("reasoning", {}).get("intent", "M1 Action Plan")
        )

        cls._idempotency_cache[cache_key] = plan
        return plan
