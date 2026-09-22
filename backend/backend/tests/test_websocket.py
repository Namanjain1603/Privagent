import json
import pytest
from fastapi.testclient import TestClient
from backend.websocket_server import ws_app, manager

client = TestClient(ws_app)

def test_ws_server_connects():
    """TEST 2: M3-compatible WebSocket client connects."""
    with client.websocket_connect("/ws") as websocket:
        pass  # Just connecting is enough

def test_valid_dom_response(monkeypatch):
    """TEST 3: Valid DOM_RESPONSE envelope accepted."""
    from backend.services.m1_client import M1Client
    monkeypatch.setattr(M1Client, "generate_plan", lambda *a, **k: {"status": "SUCCESS", "actions": [{"type": "CLICK", "target": "#btn"}]})
    
    with client.websocket_connect("/ws") as websocket:
        payload = {
            "requestId": "req-dom-1",
            "message": {
                "type": "DOM_RESPONSE",
                "sanitizedElements": [{"id": "btn", "type": "button"}],
                "sanitizedDomSkeleton": ""
            }
        }
        websocket.send_json(payload)
        response = websocket.receive_json()
        assert response["requestId"] == "req-dom-1"
        assert response.get("status") == "RECEIVED" or "message" in response

def test_valid_screenshot_response():
    """TEST 4: Valid SCREENSHOT_RESPONSE envelope accepted."""
    with client.websocket_connect("/ws") as websocket:
        payload = {
            "requestId": "req-shot-1",
            "message": {
                "type": "SCREENSHOT_RESPONSE",
                "dataUrl": "data:image/png;base64,..."
            }
        }
        websocket.send_json(payload)
        response = websocket.receive_json()
        assert response["requestId"] == "req-shot-1"
        assert response["status"] == "RECEIVED"

def test_valid_action_result():
    """TEST 5: Valid ACTION_RESULT envelope accepted."""
    with client.websocket_connect("/ws") as websocket:
        payload = {
            "requestId": "req-act-1",
            "message": {
                "type": "ACTION_RESULT",
                "success": True
            }
        }
        websocket.send_json(payload)
        response = websocket.receive_json()
        assert response["requestId"] == "req-act-1"
        assert response["status"] == "RECEIVED"

def test_missing_request_id():
    """TEST 6: Missing requestId rejected."""
    with client.websocket_connect("/ws") as websocket:
        payload = {
            "message": {
                "type": "DOM_RESPONSE"
            }
        }
        websocket.send_json(payload)
        response = websocket.receive_json()
        assert "error" in response
        assert "Missing requestId" in response["error"]

def test_missing_message():
    """TEST 7: Missing message rejected."""
    with client.websocket_connect("/ws") as websocket:
        payload = {
            "requestId": "req-missing-msg"
        }
        websocket.send_json(payload)
        response = websocket.receive_json()
        assert "error" in response
        assert "Missing or invalid message" in response["error"]

def test_unsupported_message_type():
    """TEST 8: Unsupported message type rejected."""
    with client.websocket_connect("/ws") as websocket:
        payload = {
            "requestId": "req-bad-type",
            "message": {
                "type": "INVALID_TYPE"
            }
        }
        websocket.send_json(payload)
        response = websocket.receive_json()
        assert "error" in response
        assert "Unsupported message type" in response["error"]

def test_malformed_json():
    """TEST 9: Malformed JSON handled."""
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text("this is not json")
        response = websocket.receive_json()
        assert "error" in response
        assert "Invalid JSON payload" in response["error"]

def test_disconnect_handled():
    """TEST 10: Disconnect handled."""
    initial_count = len(manager.active_connections)
    with client.websocket_connect("/ws") as websocket:
        assert len(manager.active_connections) == initial_count + 1
    # connection closed
    assert len(manager.active_connections) == initial_count

def test_multi_client_isolation():
    """TEST 11: Two WebSocket clients can remain isolated."""
    with client.websocket_connect("/ws") as ws1:
        with client.websocket_connect("/ws") as ws2:
            ws1.send_json({"requestId": "r1", "message": {"type": "DOM_RESPONSE"}})
            resp1 = ws1.receive_json()
            assert resp1["requestId"] == "r1"
            
            ws2.send_json({"requestId": "r2", "message": {"type": "DOM_RESPONSE"}})
            resp2 = ws2.receive_json()
            assert resp2["requestId"] == "r2"

def test_pii_logging_protection(caplog):
    """TEST 12: Raw sensitive payload is NOT logged."""
    import logging
    caplog.set_level(logging.INFO, logger="privagent_ws")
    
    with client.websocket_connect("/ws") as websocket:
        sensitive_payload = {
            "requestId": "req-sec",
            "message": {
                "type": "DOM_RESPONSE",
                "sanitizedElements": [{"id": "pwd", "value": "mySecretPassword123"}],
                "sanitizedDomSkeleton": ""
            }
        }
        websocket.send_json(sensitive_payload)
        websocket.receive_json()
        
    for record in caplog.records:
        assert "mySecretPassword123" not in record.message
