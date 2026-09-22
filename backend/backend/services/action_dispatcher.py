import logging
from typing import Dict, Any
from backend.schemas.action import Action, ActionType

logger = logging.getLogger(__name__)

class ActionDispatcher:
    
    @staticmethod
    def create_m3_envelope(request_id: str, action: Action) -> Dict[str, Any]:
        """
        Normalizes M5 Action into M3-compatible ACTION_REQUEST format.
        """
        payload: Dict[str, Any] = {
            "type": action.type.value
        }
        
        if action.type == ActionType.CLICK:
            payload["target"] = action.target
        elif action.type == ActionType.TYPE:
            payload["target"] = action.target
            payload["value"] = action.value
        elif action.type == ActionType.SELECT:
            payload["target"] = action.target
            payload["value"] = action.value
        elif action.type == ActionType.NAVIGATE:
            payload["url"] = action.target
        elif action.type == ActionType.SCROLL:
            # M3 accepts direction and amount for SCROLL
            payload["direction"] = str(action.direction).lower() if action.direction else "down"
            if action.amount is not None:
                payload["amount"] = action.amount
                
        envelope = {
            "requestId": request_id,
            "message": {
                "type": "ACTION_REQUEST",
                "action": payload
            }
        }
        
        return envelope
