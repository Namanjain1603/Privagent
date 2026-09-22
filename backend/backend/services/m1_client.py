import httpx
import uuid
import logging
from typing import List, Dict, Any
from backend.config import settings

logger = logging.getLogger(__name__)

class M1ClientError(Exception):
    pass

class M1Client:
    
    @classmethod
    def generate_plan(cls, session_id: str, instruction: str, url: str, title: str, elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calls M1 to generate an action plan.
        Returns the parsed JSON response from M1.
        Raises M1ClientError if M1 is unreachable or returns invalid/failed response.
        """
        # M1 Plan Schema mapping
        page_context = {
            "url": url,
            "title": title,
            "elements": []
        }
        
        # We only pass allowed fields to M1. NEVER forward raw sensitive secrets.
        # M5 has already ensured the elements list is sanitized.
        for el in elements:
            m1_el = {
                "id": el.get("id") or el.get("selector") or f"id_{uuid.uuid4().hex[:8]}", # Fallback ID since M1 requires it
                "type": el.get("tag") or "text", # using tag since type can be input type
                "label": el.get("label"),
                "value": el.get("text_content") or el.get("value"),
                "selector": el.get("selector"),
                "disabled": not el.get("is_interactive", True)
            }
            # Clean up Nones
            m1_el = {k: v for k, v in m1_el.items() if v is not None}
            page_context["elements"].append(m1_el)
            
        payload = {
            "taskId": session_id,
            "instruction": instruction,
            "pageContext": page_context,
            "previousActions": []
        }
        
        m1_url = f"{settings.M1_BASE_URL.rstrip('/')}{settings.M1_PLAN_PATH}"
        
        try:
            # Bounded HTTP timeout for M1.
            with httpx.Client(timeout=15.0) as client:
                response = client.post(m1_url, json=payload, headers={"X-Request-ID": session_id})
                response.raise_for_status()
                data = response.json()
        except httpx.TimeoutException:
            logger.error(f"M1 Timeout for session {session_id}")
            raise M1ClientError("M1_TIMEOUT: Planning engine timed out.")
        except httpx.RequestError as e:
            logger.error(f"M1 Connection Error for session {session_id}: {e}")
            raise M1ClientError("M1_UNAVAILABLE: Could not connect to planning engine.")
        except httpx.HTTPStatusError as e:
            logger.error(f"M1 HTTP Error for session {session_id}: {e.response.status_code}")
            raise M1ClientError(f"M1_HTTP_ERROR: Planning engine returned status {e.response.status_code}.")
        except Exception as e:
            logger.error(f"M1 Unexpected Error for session {session_id}: {e}")
            raise M1ClientError("M1_ERROR: Unexpected error communicating with M1.")
            
        if not isinstance(data, dict):
            raise M1ClientError("M1_MALFORMED_RESPONSE: Response is not a JSON object.")
            
        status = data.get("status")
        if status != "SUCCESS":
            # Pass the structured error up
            code = data.get("code", "UNKNOWN")
            msg = data.get("message", "M1 returned an error without a message")
            raise M1ClientError(f"M1_PLANNING_FAILED: [{code}] {msg}")
            
        return data
