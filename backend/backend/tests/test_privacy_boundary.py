import pytest
from fastapi import status


@pytest.fixture
def active_session(client):
    sid = "sess_privacy_test_01"
    client.post("/session", json={"session_id": sid, "user_task": "Search train tickets"})
    return sid


def test_sanitized_context_accepted(client, active_session):
    """7. Valid sanitized context certified by M2 Privacy Guard is accepted."""
    payload = {
        "session_id": active_session,
        "url": "https://irctc.co.in/nget/train-search",
        "page_title": "IRCTC Next Gen eTicketing",
        "sanitized_context": {
            "page_title": "IRCTC Next Gen eTicketing",
            "page_url": "https://irctc.co.in/nget/train-search",
            "sanitized_elements": [
                {
                    "tag": "input",
                    "type": "text",
                    "selector": "#origin-input",
                    "text_content": "",
                    "label": "From Station",
                    "is_interactive": True
                },
                {
                    "tag": "button",
                    "type": "submit",
                    "selector": "#search-btn",
                    "text_content": "Search",
                    "label": "Search",
                    "is_interactive": True
                }
            ],
            "sanitized_dom_skeleton": "",
            "redaction_verified": True,
            "redacted_token_count": 2
        }
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ACCEPTED"
    assert data["session_id"] == active_session
    assert data["privacy_verified"] is True
    assert data["sanitized_element_count"] == 2


def test_unverified_redaction_rejected(client, active_session):
    """8. Unverified redaction flag (redaction_verified=False) is rejected with 400."""
    payload = {
        "session_id": active_session,
        "url": "https://irctc.co.in/nget/train-search",
        "sanitized_context": {
            "page_url": "https://irctc.co.in/nget/train-search",
            "sanitized_elements": [],
            "sanitized_dom_skeleton": "",
            "redaction_verified": False,
            "redacted_token_count": 0
        }
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "PRIVACY_BOUNDARY_VIOLATION" in response.text


def test_raw_sensitive_keys_rejected(client, active_session):
    """9. Context containing forbidden sensitive keys (e.g. password, otp, raw_screenshot) rejected with 422."""
    payload = {
        "session_id": active_session,
        "url": "https://example.com/login",
        "sanitized_context": {
            "page_url": "https://example.com/login",
            "sanitized_elements": [],
            "sanitized_dom_skeleton": "",
            "redaction_verified": True,
            "redacted_token_count": 0,
            "password": "plainTextPassword123"  # FORBIDDEN KEY
        }
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_pii_leakage_aadhaar_rejected(client, active_session):
    """10a. Raw Aadhaar format in unredacted element text is blocked with 422."""
    payload = {
        "session_id": active_session,
        "url": "https://uidai.gov.in",
        "sanitized_context": {
            "page_url": "https://uidai.gov.in",
            "sanitized_elements": [
                {
                    "selector": "#aadhaar-field",
                    "text_content": "User Aadhaar: 2345 6789 0123",
                    "is_interactive": True
                }
            ],
            "sanitized_dom_skeleton": "",
            "redaction_verified": True,
            "redacted_token_count": 0
        }
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "PII_LEAK_DETECTED" in response.text


def test_pii_leakage_otp_rejected(client, active_session):
    """10b. Raw OTP format in unredacted element text is blocked with 422."""
    payload = {
        "session_id": active_session,
        "url": "https://bank.gov.in/verify",
        "sanitized_context": {
            "page_url": "https://bank.gov.in/verify",
            "sanitized_elements": [
                {
                    "selector": "#otp-msg",
                    "text_content": "Your OTP: 849201",
                    "is_interactive": False
                }
            ],
            "sanitized_dom_skeleton": "",
            "redaction_verified": True,
            "redacted_token_count": 0
        }
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "PII_LEAK_DETECTED" in response.text
