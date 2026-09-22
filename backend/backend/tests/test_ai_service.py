import pytest
from fastapi import status
from backend.services.ai_service import AIService
from backend.config import settings


@pytest.fixture
def active_session(client):
    sid = "sess_ai_test_01"
    client.post("/session", json={"session_id": sid, "user_task": "Book railway ticket"})
    return sid


def test_m1_planning_success(monkeypatch, client, active_session):
    """M1 planning is used instead of Gemini."""
    def mock_m1_generate(*args, **kwargs):
        return {
            "status": "SUCCESS",
            "actions": [{"type": "CLICK", "target": "#submit"}]
        }
    from backend.services.m1_client import M1Client
    monkeypatch.setattr(M1Client, "generate_plan", mock_m1_generate)
    
    payload = {
        "session_id": active_session,
        "user_goal": "Click submit",
        "current_url": "https://test.com",
        "sanitized_elements": [
            {"selector": "#submit", "tag": "button"}
        ]
    }
    response = client.post("/plan", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["session_id"] == active_session
    assert data["action_plan"]["actions"][0]["type"] == "CLICK"


def test_m1_unavailable_fails_closed(monkeypatch, client, active_session):
    """If M1 is unavailable, system fails closed and does not fallback to Gemini."""
    from backend.services.m1_client import M1Client, M1ClientError
    def mock_m1_fail(*args, **kwargs):
        raise M1ClientError("M1_UNAVAILABLE: Connection refused")
        
    monkeypatch.setattr(M1Client, "generate_plan", mock_m1_fail)

    payload = {
        "session_id": active_session,
        "user_goal": "Click submit failure test",
        "current_url": "https://test-failure.com",
        "sanitized_elements": []
    }
    # Using the /plan endpoint which might return 400 or 500 when ValueError is raised
    response = client.post("/plan", json=payload)
    assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_500_INTERNAL_SERVER_ERROR, status.HTTP_422_UNPROCESSABLE_ENTITY]
    data = response.json()
    assert "M1_UNAVAILABLE" in str(data)

def test_m1_malformed_response_handled(monkeypatch):
    """Malformed M1 response results in safe error, not crash."""
    from backend.services.m1_client import M1Client, M1ClientError
    def mock_m1_fail(*args, **kwargs):
        raise M1ClientError("M1_MALFORMED_RESPONSE: Invalid format")
        
    monkeypatch.setattr(M1Client, "generate_plan", mock_m1_fail)

    import pytest
    with pytest.raises(ValueError, match="M1_MALFORMED_RESPONSE"):
        AIService.generate_plan("sess_test", "goal", "url", [])

