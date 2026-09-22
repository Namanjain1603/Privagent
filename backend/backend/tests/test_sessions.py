import pytest
from fastapi import status


def test_session_creation(client):
    """3. Session creation with valid task and custom session ID."""
    payload = {
        "session_id": "sess_test_alpha_01",
        "user_task": "Find nearby EV charging stations on government portal"
    }
    response = client.post("/session", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["session_id"] == "sess_test_alpha_01"
    assert data["status"] == "ACTIVE"
    assert data["workflow_status"] == "IDLE"
    assert data["user_task"] == payload["user_task"]
    assert data["action_count"] == 0
    assert data["error_count"] == 0


def test_session_retrieval(client):
    """4. Session retrieval by session ID."""
    sid = "sess_retrieve_01"
    client.post("/session", json={"session_id": sid, "user_task": "Check train availability"})
    
    response = client.get(f"/session/{sid}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["session_id"] == sid
    assert data["status"] == "ACTIVE"


def test_session_retrieval_not_found(client):
    """4b. Session retrieval for non-existent session returns 404."""
    response = client.get("/session/sess_non_existent_999")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_session_completion(client):
    """5. Session lifecycle transition to COMPLETED."""
    sid = "sess_complete_01"
    client.post("/session", json={"session_id": sid, "user_task": "Download hall ticket"})

    response = client.patch(f"/session/{sid}/complete")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["workflow_status"] == "COMPLETED"


def test_session_failure(client):
    """6. Session lifecycle transition to FAILED."""
    sid = "sess_fail_01"
    client.post("/session", json={"session_id": sid, "user_task": "Submit portal form"})

    response = client.patch(f"/session/{sid}/fail")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "FAILED"
    assert data["workflow_status"] == "FAILED"
