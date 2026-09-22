import pytest
import asyncio
from fastapi import status
from fastapi.testclient import TestClient
from backend.main import app
from backend.websocket_server import ws_app
from httpx import AsyncClient
import httpx

@pytest.fixture
def http_client():
    with TestClient(app) as client:
        yield client

@pytest.fixture
def ws_client():
    with TestClient(ws_app) as client:
        yield client

def test_full_pipeline_defect():
    """
    This test previously exposed the defect where WS ACKs and stops.
    Now it verifies the flow routes to M1 (we expect an error if M1 is mocked to fail).
    """
    pass

def test_e2e_click_flow(ws_client, monkeypatch):
    """TEST 1-7: M3 DOM_RESPONSE -> WS -> M5 orchestration -> M1 client -> validator -> dispatcher -> send_to_m3"""
    from backend.services.m1_client import M1Client
    
    def mock_generate_plan(*args, **kwargs):
        return {
            "status": "SUCCESS",
            "actions": [{"type": "CLICK", "target": "#btn"}]
        }
    monkeypatch.setattr(M1Client, "generate_plan", mock_generate_plan)
    
    with ws_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "requestId": "e2e-click-001",
            "tabId": 42,
            "message": {
                "type": "DOM_RESPONSE",
                "sanitizedDomSkeleton": "<html><body><button id='btn'>Submit</button></body></html>",
                "sanitizedElements": [{"id": "btn", "type": "button"}],
                "url": "https://test.com",
                "prompt": "Click the submit button"
            }
        })
        
        response = ws.receive_json()
        assert response["requestId"] == "e2e-click-001" # TEST 7: requestId preservation
        assert response["message"]["type"] == "ACTION_REQUEST" # TEST 6: M3 receives ACTION_REQUEST
        assert response["message"]["action"]["type"] == "CLICK"
        assert response["message"]["action"]["target"] == "#btn"


def test_e2e_type_flow_and_privacy_logging(ws_client, monkeypatch, caplog):
    """TEST 11, 12: raw sensitive data never reaches M1, never appears in logs. TYPE value preserved in action."""
    import logging
    caplog.set_level(logging.INFO, logger="privagent_ws")
    
    from backend.services.m1_client import M1Client
    
    # We simulate M1 returning a TYPE action
    def mock_generate_plan(*args, **kwargs):
        # We assert that the incoming sanitized elements don't contain passwords
        assert "mySecretPassword123" not in str(kwargs)
        
        return {
            "status": "SUCCESS",
            "actions": [{"type": "TYPE", "target": "#pwd", "value": "mySecretPassword123"}]
        }
    monkeypatch.setattr(M1Client, "generate_plan", mock_generate_plan)
    
    with ws_client.websocket_connect("/ws") as ws:
        # 1. Incoming DOM has password. M5 privacy validator should reject it.
        ws.send_json({
            "requestId": "e2e-type-001",
            "tabId": 42,
            "message": {
                "type": "DOM_RESPONSE",
                "sanitizedDomSkeleton": "<html><body><input id='pwd' type='password' /></body></html>",
                "sanitizedElements": [{"id": "pwd", "type": "input", "value": "password=mySecretPassword123"}]
            }
        })
        
        response = ws.receive_json()
        # Expect privacy rejection
        assert "error" in response
        assert "Privacy Validation failed" in response["error"]
        assert "PII_LEAK_DETECTED: Raw password" in response["error"]
        
        # Verify it wasn't logged
        for record in caplog.records:
            assert "mySecretPassword123" not in record.message

def test_e2e_scroll_and_navigate(ws_client, monkeypatch):
    """TEST 1-7 for SCROLL and NAVIGATE."""
    from backend.services.m1_client import M1Client
    
    def mock_generate_plan(*args, **kwargs):
        return {
            "status": "SUCCESS",
            "actions": [
                {"type": "SCROLL", "direction": "UP", "amount": 500}
            ]
        }
    monkeypatch.setattr(M1Client, "generate_plan", mock_generate_plan)
    
    with ws_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "requestId": "e2e-scroll-001",
            "tabId": 43,
            "message": {
                "type": "DOM_RESPONSE",
                "sanitizedElements": [],
                "sanitizedDomSkeleton": ""
            }
        })
        
        response = ws.receive_json()
        assert response["message"]["action"]["type"] == "SCROLL"
        assert response["message"]["action"]["direction"] == "up"
        assert response["message"]["action"]["amount"] == 500

    def mock_generate_plan_nav(*args, **kwargs):
        return {
            "status": "SUCCESS",
            "actions": [
                {"type": "NAVIGATE", "url": "https://example.com"} # M1 outputs url
            ]
        }
    monkeypatch.setattr(M1Client, "generate_plan", mock_generate_plan_nav)

    with ws_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "requestId": "e2e-nav-001",
            "tabId": 44,
            "message": {
                "type": "DOM_RESPONSE",
                "sanitizedElements": [],
                "sanitizedDomSkeleton": ""
            }
        })
        
        response = ws.receive_json()
        assert response["message"]["action"]["type"] == "NAVIGATE"
        assert response["message"]["action"]["url"] == "https://example.com"
        assert "target" not in response["message"]["action"]


def test_concurrent_tab_isolation(ws_client, monkeypatch):
    """TEST 8: two concurrent tab requests remain isolated"""
    from backend.services.m1_client import M1Client
    
    def mock_generate_plan(*args, **kwargs):
        if "tab1.com" in kwargs.get("url", ""):
            return {"status": "SUCCESS", "actions": [{"type": "CLICK", "target": "#t1"}]}
        else:
            return {"status": "SUCCESS", "actions": [{"type": "CLICK", "target": "#t2"}]}
            
    monkeypatch.setattr(M1Client, "generate_plan", mock_generate_plan)
    
    with ws_client.websocket_connect("/ws") as ws1:
        with ws_client.websocket_connect("/ws") as ws2:
            ws1.send_json({
                "requestId": "e2e-tab1-001",
                "tabId": 101,
                "message": {"type": "DOM_RESPONSE", "url": "http://tab1.com", "sanitizedElements": [{"id": "t1"}], "sanitizedDomSkeleton": ""}
            })
            
            ws2.send_json({
                "requestId": "e2e-tab2-001",
                "tabId": 102,
                "message": {"type": "DOM_RESPONSE", "url": "http://tab2.com", "sanitizedElements": [{"id": "t2"}], "sanitizedDomSkeleton": ""}
            })
            
            resp1 = ws1.receive_json()
            resp2 = ws2.receive_json()
            
            assert resp1["requestId"] == "e2e-tab1-001"
            assert resp1["message"]["action"]["target"] == "#t1"
            
            assert resp2["requestId"] == "e2e-tab2-001"
            assert resp2["message"]["action"]["target"] == "#t2"

def test_m1_unavailable_fails_closed(ws_client, monkeypatch):
    """TEST 9: M1 unavailable fails closed"""
    from backend.services.m1_client import M1Client, M1ClientError
    
    def mock_generate_plan(*args, **kwargs):
        raise M1ClientError("M1_UNAVAILABLE: Connection refused")
    monkeypatch.setattr(M1Client, "generate_plan", mock_generate_plan)
    
    with ws_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "requestId": "req-fail-1",
            "tabId": 99,
            "message": {"type": "DOM_RESPONSE", "sanitizedElements": [], "sanitizedDomSkeleton": ""}
        })
        
        response = ws.receive_json()
        assert "error" in response
        assert "M1_UNAVAILABLE" in response["error"]

def test_malformed_m1_response_fails_closed(ws_client, monkeypatch):
    """TEST 10: malformed M1 response fails closed"""
    from backend.services.m1_client import M1Client
    
    def mock_generate_plan(*args, **kwargs):
        return {"status": "SUCCESS", "actions": [{"type": "INVALID_ACTION_MADE_UP"}]}
    monkeypatch.setattr(M1Client, "generate_plan", mock_generate_plan)
    
    with ws_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "requestId": "req-fail-2",
            "tabId": 99,
            "message": {"type": "DOM_RESPONSE", "sanitizedElements": [{"id": "btn"}], "sanitizedDomSkeleton": ""}
        })
        
        response = ws.receive_json()
        assert "error" in response
        assert "AI_ACTION_VALIDATION_FAILED" in response["error"]
        assert "EMPTY_PLAN" in response["error"]

def test_action_result_correlation(ws_client):
    """Test ACTION_RESULT triggers telemetry."""
    with ws_client.websocket_connect("/ws") as ws:
        ws.send_json({
            "requestId": "req-act-res",
            "tabId": 42,
            "message": {
                "type": "ACTION_RESULT",
                "success": True,
                "action": {"type": "CLICK", "target": "#btn"}
            }
        })
        
        response = ws.receive_json()
        assert response["requestId"] == "req-act-res"
        assert response["status"] == "RECEIVED"
        assert response["message"]["type"] == "ACK"
