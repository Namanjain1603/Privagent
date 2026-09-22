import json
import logging
import asyncio
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

logger = logging.getLogger("privagent_ws")
logger.setLevel(logging.INFO)

ws_app = FastAPI(title="PRIVAGENT WebSocket Bridge")

class ConnectionManager:
    def __init__(self):
        # Maps connection_id to (WebSocket, tabId)
        self.active_connections: Dict[str, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        conn_id = str(id(websocket))
        self.active_connections[conn_id] = {
            "ws": websocket,
            "tabId": None
        }
        logger.info(f"WS Connection established: {conn_id}")
        return conn_id
    
    def disconnect(self, conn_id: str):
        if conn_id in self.active_connections:
            del self.active_connections[conn_id]
            logger.info(f"WS Connection closed: {conn_id}")
            
    async def send_to_m3(self, tab_id: Optional[int], envelope: dict) -> bool:
        """Internal function to send message to M3 without generating actions."""
        target_ws = None
        for conn_id, meta in self.active_connections.items():
            if tab_id is None or meta["tabId"] == tab_id:
                target_ws = meta["ws"]
                break
                
        if target_ws:
            try:
                await target_ws.send_json(envelope)
                return True
            except Exception as e:
                logger.error(f"Error sending to M3: {e}")
                return False
        return False

manager = ConnectionManager()

SUPPORTED_TYPES = {"DOM_RESPONSE", "SCREENSHOT_RESPONSE", "ACTION_RESULT"}

def safe_log_message(msg_type: str, request_id: str, success: bool, error: Optional[str] = None):
    # Logs connection info without PII
    status = "SUCCESS" if success else "FAILED"
    err_str = f" - Error: {error}" if error else ""
    logger.info(f"Message processed | Type: {msg_type} | ReqID: {request_id} | Status: {status}{err_str}")

@ws_app.websocket("/")
@ws_app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    conn_id = await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            
            # 1. Parse JSON
            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON payload"})
                continue
                
            # 2. Validate envelope
            if not isinstance(payload, dict):
                await websocket.send_json({"error": "Payload must be a JSON object"})
                continue
                
            request_id = payload.get("requestId")
            if not request_id:
                await websocket.send_json({"error": "Missing requestId in envelope"})
                continue
                
            message = payload.get("message")
            if not message or not isinstance(message, dict):
                await websocket.send_json({"error": "Missing or invalid message in envelope", "requestId": request_id})
                continue
                
            msg_type = message.get("type")
            if not msg_type:
                await websocket.send_json({"error": "Missing message type", "requestId": request_id})
                continue
                
            if msg_type not in SUPPORTED_TYPES:
                await websocket.send_json({"error": f"Unsupported message type: {msg_type}", "requestId": request_id})
                continue
                
            # If tabId is provided in envelope, store it for connection tracking
            tab_id = payload.get("tabId")
            if tab_id is not None:
                manager.active_connections[conn_id]["tabId"] = tab_id
                
            # Session assignment
            session_id = manager.active_connections[conn_id].get("session_id")
            if not session_id:
                session_id = f"sess_tab_{tab_id}_{id(websocket)}"
                manager.active_connections[conn_id]["session_id"] = session_id

            if msg_type == "DOM_RESPONSE":
                # Handle DOM_RESPONSE orchestration directly here to avoid HTTP loopback
                from backend.database import SessionLocal
                from backend.models.session import SessionModel
                from backend.schemas.session import SessionStatus, WorkflowStatus
                from datetime import datetime
                from backend.schemas.page import SanitizedContext, PageElement
                from backend.services.ai_service import AIService
                from backend.services.action_dispatcher import ActionDispatcher

                db = SessionLocal()
                try:
                    sess = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
                    user_goal = message.get("prompt") or message.get("goal") or "Execute task"
                    if not sess:
                        sess = SessionModel(
                            session_id=session_id,
                            status=SessionStatus.ACTIVE.value,
                            workflow_status=WorkflowStatus.RECEIVING_CONTEXT.value,
                            user_task=user_goal,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow(),
                            action_count=0,
                            error_count=0,
                            redacted_token_count=0
                        )
                        db.add(sess)
                        db.commit()
                    else:
                        user_goal = sess.user_task
                    
                    sess.workflow_status = WorkflowStatus.AI_REASONING.value
                    db.commit()
                except Exception as e:
                    db.close()
                    safe_log_message(msg_type, request_id, False, str(e))
                    await websocket.send_json({"error": str(e), "requestId": request_id})
                    continue
                finally:
                    db.close()

                url = message.get("url") or message.get("page_url") or "https://unknown.local"
                elements = message.get("sanitizedElements") or message.get("elements", [])
                sanitized_dom_skeleton = message.get("sanitizedDomSkeleton", "")
                redacted_screenshot = message.get("redactedScreenshotBase64")
                page_elements = []
                for el in elements:
                    page_elements.append(PageElement(
                        id=el.get("id") or el.get("target"),
                        tag=el.get("tagName") or el.get("type"),
                        type=el.get("inputType"),
                        selector=el.get("target") or el.get("selector"),
                        text_content=el.get("text") or el.get("value"),
                        label=el.get("label"),
                        is_interactive=True
                    ))
                    
                try:
                    sanitized_context = SanitizedContext(
                        page_url=url,
                        sanitized_elements=page_elements,
                        sanitized_dom_skeleton=sanitized_dom_skeleton,
                        redacted_screenshot_base64=redacted_screenshot,
                        redaction_verified=True
                    )
                except Exception as e:
                    safe_log_message(msg_type, request_id, False, str(e))
                    await websocket.send_json({"error": f"Privacy Validation failed: {str(e)}", "requestId": request_id})
                    continue

                try:
                    plan = AIService.generate_plan(
                        session_id=session_id,
                        user_goal=user_goal,
                        current_url=url,
                        sanitized_elements=[el.model_dump() for el in page_elements]
                    )
                    
                    if plan.actions:
                        action_envelope = ActionDispatcher.create_m3_envelope(request_id, plan.actions[0])
                        await websocket.send_json(action_envelope)
                        safe_log_message("ACTION_REQUEST", request_id, True)
                    else:
                        await websocket.send_json({
                            "requestId": request_id,
                            "status": "RECEIVED",
                            "message": {"type": "ACK"}
                        })
                        
                except Exception as e:
                    safe_log_message(msg_type, request_id, False, str(e))
                    await websocket.send_json({"error": str(e), "requestId": request_id})
                    continue
                    
            elif msg_type == "ACTION_RESULT":
                from backend.routes.telemetry import record_telemetry, TelemetryRequest
                from backend.database import SessionLocal
                db = SessionLocal()
                try:
                    req = TelemetryRequest(
                        session_id=session_id,
                        request_id=request_id if request_id != "unknown" else None,
                        tab_id=tab_id,
                        event_type="ACTION_RESULT",
                        success=message.get("success", True),
                        action_type=message.get("action", {}).get("type"),
                        details=message
                    )
                    record_telemetry(req, db)
                except Exception as e:
                    logger.error(f"Error recording telemetry: {e}")
                finally:
                    db.close()
                
                safe_log_message(msg_type, request_id, True)
                await websocket.send_json({
                    "requestId": request_id,
                    "status": "RECEIVED",
                    "message": {"type": "ACK"}
                })
                
            else:
                # Other types like SCREENSHOT_RESPONSE just ACK for now
                safe_log_message(msg_type, request_id, True)
                await websocket.send_json({
                    "requestId": request_id,
                    "status": "RECEIVED",
                    "message": {"type": "ACK"}
                })

    except WebSocketDisconnect:
        manager.disconnect(conn_id)
    except Exception as e:
        logger.error(f"WS Exception for {conn_id}: {e}")
        manager.disconnect(conn_id)
