import pytest
from fastapi import status
from backend.schemas.action import Action, ActionType
from backend.services.validator import ActionValidatorService


@pytest.fixture
def active_session(client):
    sid = "sess_action_test_01"
    client.post("/session", json={"session_id": sid, "user_task": "Execute validated actions"})
    return sid


def test_valid_click_action(client, active_session):
    """11. Valid CLICK action approved."""
    payload = {
        "session_id": active_session,
        "action": {
            "type": "CLICK",
            "target": "#submit-button",
            "description": "Click submit button"
        }
    }
    response = client.post("/validate-action", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_safe"] is True
    assert data["action_type"] == "CLICK"
    assert data["rejection_reason"] is None


def test_valid_type_action(client, active_session):
    """12. Valid TYPE action approved."""
    payload = {
        "session_id": active_session,
        "action": {
            "type": "TYPE",
            "target": "input[name='search_query']",
            "value": "EV Charging Stations Connaught Place",
            "description": "Type search term"
        }
    }
    response = client.post("/validate-action", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_safe"] is True
    assert data["action_type"] == "TYPE"


def test_valid_select_action(client, active_session):
    """13. Valid SELECT action approved."""
    payload = {
        "session_id": active_session,
        "action": {
            "type": "SELECT",
            "target": "select#quota-dropdown",
            "value": "GENERAL",
            "description": "Select quota option"
        }
    }
    response = client.post("/validate-action", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_safe"] is True
    assert data["action_type"] == "SELECT"


def test_valid_scroll_action(client, active_session):
    """14. Valid SCROLL action approved."""
    payload = {
        "session_id": active_session,
        "action": {
            "type": "SCROLL",
            "direction": "down",
            "amount": 100,
            "description": "Scroll down results"
        }
    }
    response = client.post("/validate-action", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_safe"] is True
    assert data["action_type"] == "SCROLL"

def test_invalid_scroll_actions(client, active_session):
    """SCROLL edge cases for direction and amount."""
    invalid_payloads = [
        # zero amount
        {"type": "SCROLL", "direction": "up", "amount": 0},
        # negative amount
        {"type": "SCROLL", "direction": "down", "amount": -50},
        # missing direction
        {"type": "SCROLL", "amount": 100},
        # invalid direction
        {"type": "SCROLL", "direction": "left", "amount": 100},
        # invalid amount type
        {"type": "SCROLL", "direction": "down", "amount": "abc"}
    ]
    for act in invalid_payloads:
        res = client.post("/validate-action", json={"session_id": active_session, "action": act})
        assert res.json()["is_safe"] is False
        assert "INVALID_SCROLL" in res.json()["rejection_reason"]


def test_valid_navigate_action(client, active_session):
    """15. Valid NAVIGATE action approved with secure HTTPS scheme."""
    payload = {
        "session_id": active_session,
        "action": {
            "type": "NAVIGATE",
            "target": "https://pib.gov.in/PressReleasePage.aspx",
            "description": "Navigate to press release"
        }
    }
    response = client.post("/validate-action", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_safe"] is True
    assert data["action_type"] == "NAVIGATE"


def test_arbitrary_action_rejected(client, active_session):
    """16. Arbitrary / unsupported action types strictly rejected."""
    payload = {
        "session_id": active_session,
        "action": {
            "type": "EXECUTE_SYSTEM_COMMAND",
            "target": "rm -rf /",
            "description": "Dangerous execution"
        }
    }
    response = client.post("/validate-action", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_safe"] is False
    assert "UNSUPPORTED_ACTION_TYPE" in data["rejection_reason"]


def test_javascript_code_execution_rejected(client, active_session):
    """17. JavaScript / script tags / eval injection strictly rejected."""
    # Test 1: In target
    payload1 = {
        "session_id": active_session,
        "action": {
            "type": "CLICK",
            "target": "button<script>alert(document.cookie)</script>",
            "description": "XSS vector in target"
        }
    }
    res1 = client.post("/validate-action", json=payload1)
    assert res1.json()["is_safe"] is False
    assert "DANGEROUS_TARGET" in res1.json()["rejection_reason"]

    # Test 2: In TYPE value
    payload2 = {
        "session_id": active_session,
        "action": {
            "type": "TYPE",
            "target": "#input-search",
            "value": "eval(window.location='http://attacker.com')",
            "description": "Code execution vector in value"
        }
    }
    res2 = client.post("/validate-action", json=payload2)
    assert res2.json()["is_safe"] is False
    assert "DANGEROUS_VALUE_INJECTION" in res2.json()["rejection_reason"]


def test_unsafe_navigation_schemes_rejected(client, active_session):
    """18. Non-HTTP(S) schemes such as javascript:, file:, data: rejected."""
    unsafe_targets = [
        "javascript:alert(1)",
        "data:text/html,<script>evil()</script>",
        "file:///etc/passwd",
        "chrome://settings"
    ]
    for target in unsafe_targets:
        payload = {
            "session_id": active_session,
            "action": {
                "type": "NAVIGATE",
                "target": target,
                "description": "Malicious navigation"
            }
        }
        res = client.post("/validate-action", json=payload)
        assert res.json()["is_safe"] is False
        assert "UNSAFE_URL_SCHEME" in res.json()["rejection_reason"] or "DANGEROUS_TARGET" in res.json()["rejection_reason"]


def test_malformed_action_rejected():
    """19. Direct service call with malformed or empty action is rejected."""
    is_safe, reason = ActionValidatorService.validate_action(None)
    assert is_safe is False
    assert "MALFORMED_ACTION" in reason

    is_safe2, reason2 = ActionValidatorService.validate_action({})
    assert is_safe2 is False
    assert "EMPTY_ACTION_TYPE" in reason2

    is_safe3, reason3 = ActionValidatorService.validate_action({"type": "CLICK", "target": ""})
    assert is_safe3 is False
    assert "EMPTY_TARGET" in reason3
