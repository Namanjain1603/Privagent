import re
from urllib.parse import urlparse
from typing import List, Tuple, Optional, Any, Union
from backend.config import settings
from backend.schemas.action import Action, ActionType


class ActionValidatorService:
    ALLOWED_ACTIONS = {
        "CLICK",
        "TYPE",
        "SELECT",
        "SCROLL",
        "NAVIGATE"
    }

    DISALLOWED_SCHEMES = {
        "javascript", "data", "vbscript", "file", "chrome", 
        "about", "chrome-extension", "blob", "ws", "wss"
    }

    DANGEROUS_PATTERNS = [
        re.compile(r"javascript:", re.IGNORECASE),
        re.compile(r"data:\s*text/html", re.IGNORECASE),
        re.compile(r"vbscript:", re.IGNORECASE),
        re.compile(r"<script[\s>]", re.IGNORECASE),
        re.compile(r"</script>", re.IGNORECASE),
        re.compile(r"onload\s*=", re.IGNORECASE),
        re.compile(r"onerror\s*=", re.IGNORECASE),
        re.compile(r"onclick\s*=", re.IGNORECASE),
        re.compile(r"onmouseover\s*=", re.IGNORECASE),
        re.compile(r"eval\s*\(", re.IGNORECASE),
        re.compile(r"exec\s*\(", re.IGNORECASE),
        re.compile(r"Function\s*\(", re.IGNORECASE),
        re.compile(r"document\.cookie", re.IGNORECASE),
        re.compile(r"localStorage\.", re.IGNORECASE),
        re.compile(r"sessionStorage\.", re.IGNORECASE),
        re.compile(r"fetch\s*\(", re.IGNORECASE),
        re.compile(r"XMLHttpRequest", re.IGNORECASE),
        re.compile(r"__proto__", re.IGNORECASE),
        re.compile(r"constructor\s*\[", re.IGNORECASE),
        re.compile(r"window\.location", re.IGNORECASE),
        re.compile(r"document\.write", re.IGNORECASE),
        re.compile(r"subprocess", re.IGNORECASE),
        re.compile(r"child_process", re.IGNORECASE),
        re.compile(r"/bin/(ba)?sh", re.IGNORECASE),
        re.compile(r"powershell", re.IGNORECASE),
        re.compile(r"cmd\.exe", re.IGNORECASE)
    ]

    @classmethod
    def validate_action(cls, action: Union[Action, dict, Any]) -> Tuple[bool, Optional[str]]:
        if action is None:
            return False, "MALFORMED_ACTION: Action object is null or missing."

        # Extract fields whether Action model or raw dict
        if isinstance(action, dict):
            raw_type = action.get("type")
            target = action.get("target")
            value = action.get("value")
        elif hasattr(action, "type"):
            raw_type = action.type.value if hasattr(action.type, "value") else str(action.type)
            target = getattr(action, "target", None)
            value = getattr(action, "value", None)
        else:
            return False, "MALFORMED_ACTION: Unrecognized action structure."

        if not raw_type:
            return False, "EMPTY_ACTION_TYPE: Action type cannot be null or empty."

        clean_type = str(raw_type).strip().upper()
        if clean_type not in cls.ALLOWED_ACTIONS:
            return False, f"UNSUPPORTED_ACTION_TYPE: '{raw_type}' is strictly disallowed."

        if clean_type != "SCROLL":
            if not target or not str(target).strip():
                return False, "EMPTY_TARGET: Target identifier cannot be blank for this action type."

            target_str = str(target).strip()
            if len(target_str) > settings.MAX_TARGET_LENGTH:
                return False, f"TARGET_TOO_LONG: Exceeds {settings.MAX_TARGET_LENGTH} character limit."

            for pattern in cls.DANGEROUS_PATTERNS:
                if pattern.search(target_str):
                    return False, "DANGEROUS_TARGET: Potentially executable payload detected in target."
        else:
            if target and str(target).strip():
                target_str = str(target).strip()
                if len(target_str) > settings.MAX_TARGET_LENGTH:
                    return False, f"TARGET_TOO_LONG: Exceeds {settings.MAX_TARGET_LENGTH} character limit."
                for pattern in cls.DANGEROUS_PATTERNS:
                    if pattern.search(target_str):
                        return False, "DANGEROUS_TARGET: Potentially executable payload detected in target."

            direction = getattr(action, "direction", None) if not isinstance(action, dict) else action.get("direction")
            if not direction or str(direction).strip().upper() not in ["UP", "DOWN", "TOP", "BOTTOM"]:
                return False, "INVALID_SCROLL_DIRECTION: Direction must be UP, DOWN, TOP, or BOTTOM."

            amount = getattr(action, "amount", None) if not isinstance(action, dict) else action.get("amount")
            if amount is not None:
                try:
                    amt = int(amount)
                    if amt <= 0:
                        return False, "INVALID_SCROLL_AMOUNT: Scroll amount must be positive."
                except (ValueError, TypeError):
                    return False, "INVALID_SCROLL_AMOUNT: Scroll amount must be numeric."

        if clean_type == "NAVIGATE":
            target_str = str(target).strip()
            parsed = urlparse(target_str)
            scheme = parsed.scheme.lower() if parsed.scheme else ""

            if scheme in cls.DISALLOWED_SCHEMES or scheme not in settings.ALLOWED_NAV_SCHEMES:
                return False, f"UNSAFE_URL_SCHEME: Scheme '{scheme}' is forbidden. Only HTTP/HTTPS permitted."

            if not parsed.netloc:
                return False, "INVALID_URL: Missing network location / domain."

        if clean_type == "TYPE":
            val_str = str(value or "")
            if len(val_str) > settings.MAX_VALUE_LENGTH:
                return False, f"VALUE_TOO_LONG: Input value exceeds {settings.MAX_VALUE_LENGTH} characters."

            for pattern in cls.DANGEROUS_PATTERNS:
                if pattern.search(val_str):
                    return False, "DANGEROUS_VALUE_INJECTION: Executable script or code detected in input value."

        return True, None

    @classmethod
    def validate_action_plan(cls, actions: List[Union[Action, dict]]) -> Tuple[bool, List[Action], List[str], Optional[str]]:
        if not actions:
            return False, [], ["EMPTY_PLAN: ActionPlan must contain at least one action."], "EMPTY_ACTION_PLAN"

        if len(actions) > settings.MAX_ACTIONS_PER_PLAN:
            msg = f"PLAN_TOO_LONG: Capped at {settings.MAX_ACTIONS_PER_PLAN} actions."
            return False, [], [msg], "ACTION_LIMIT_EXCEEDED"

        validated: List[Action] = []
        rejections: List[str] = []

        for idx, act in enumerate(actions):
            is_safe, reason = cls.validate_action(act)
            if not is_safe:
                act_type = getattr(act, "type", None) or (act.get("type") if isinstance(act, dict) else "UNKNOWN")
                rejections.append(f"Action #{idx + 1} ({act_type}): {reason}")
            else:
                if isinstance(act, Action):
                    validated.append(act)
                else:
                    validated.append(Action(
                        type=ActionType(act["type"].upper()),
                        target=act.get("target"),
                        value=act.get("value"),
                        description=act.get("description"),
                        direction=act.get("direction"),
                        amount=act.get("amount")
                    ))

        if rejections:
            return False, validated, rejections, "UNSAFE_ACTION_DETECTED"

        return True, validated, [], None
