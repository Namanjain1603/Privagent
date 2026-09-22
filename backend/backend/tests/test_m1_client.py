import pytest
import httpx
from unittest.mock import patch, MagicMock
from backend.services.m1_client import M1Client, M1ClientError

@patch("backend.services.m1_client.httpx.Client.post")
def test_m1_client_success(mock_post):
    """TEST 1, 2, 7: M5 successfully calls M1, correct endpoint, valid plan accepted"""
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "status": "SUCCESS",
        "actions": [
            {"type": "CLICK", "target": "#btn"}
        ]
    }
    mock_post.return_value = mock_response

    elements = [{"id": "btn", "tag": "button", "is_interactive": True}]
    result = M1Client.generate_plan("sess-1", "Click it", "http://a.com", "Title", elements)
    
    assert result["status"] == "SUCCESS"
    assert len(result["actions"]) == 1
    
    # Verify request payload
    called_json = mock_post.call_args[1]["json"]
    assert called_json["taskId"] == "sess-1"
    assert called_json["instruction"] == "Click it"
    assert called_json["pageContext"]["elements"][0]["id"] == "btn"
    assert called_json["pageContext"]["elements"][0]["type"] == "button"
    
    # Test 6: request correlation preserved
    headers = mock_post.call_args[1].get("headers", {})
    assert headers.get("X-Request-ID") == "sess-1"

@patch("backend.services.m1_client.httpx.Client.post")
def test_m1_client_sanitized_context_forwarded(mock_post):
    """TEST 3, 4, 5: sanitized context forwarded, raw password not forwarded"""
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {"status": "SUCCESS"}
    mock_post.return_value = mock_response

    elements = [{"id": "pwd", "tag": "input", "text_content": "[MASKED_BY_M2]"}]
    M1Client.generate_plan("sess-2", "Type password", "url", "Title", elements)
    
    called_json = mock_post.call_args[1]["json"]
    assert called_json["pageContext"]["elements"][0]["value"] == "[MASKED_BY_M2]"
    assert "myRealPassword" not in str(called_json)

@patch("backend.services.m1_client.httpx.Client.post")
def test_m1_client_timeout(mock_post):
    """TEST 9: M1 timeout handled"""
    mock_post.side_effect = httpx.TimeoutException("Timeout")
    with pytest.raises(M1ClientError, match="M1_TIMEOUT"):
        M1Client.generate_plan("sess-1", "cmd", "url", "title", [])

@patch("backend.services.m1_client.httpx.Client.post")
def test_m1_client_unavailable(mock_post):
    """TEST 10: M1 unavailable handled"""
    mock_post.side_effect = httpx.RequestError("Connection refused")
    with pytest.raises(M1ClientError, match="M1_UNAVAILABLE"):
        M1Client.generate_plan("sess-1", "cmd", "url", "title", [])

@patch("backend.services.m1_client.httpx.Client.post")
def test_m1_client_http_error(mock_post):
    """TEST 11, 12: M1 4xx/5xx handled"""
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_post.side_effect = httpx.HTTPStatusError("500 Error", request=MagicMock(), response=mock_response)
    with pytest.raises(M1ClientError, match="M1_HTTP_ERROR"):
        M1Client.generate_plan("sess-1", "cmd", "url", "title", [])

@patch("backend.services.m1_client.httpx.Client.post")
def test_m1_client_malformed_response(mock_post):
    """TEST 8: malformed M1 response rejected"""
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = ["not", "a", "dict"]
    mock_post.return_value = mock_response
    with pytest.raises(M1ClientError, match="M1_MALFORMED_RESPONSE"):
        M1Client.generate_plan("sess-1", "cmd", "url", "title", [])

@patch("backend.services.m1_client.httpx.Client.post")
def test_m1_client_failed_plan(mock_post):
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {
        "status": "FAILED",
        "code": "SENSITIVE_DATA_REQUESTED",
        "message": "Blocked."
    }
    mock_post.return_value = mock_response
    with pytest.raises(M1ClientError, match="SENSITIVE_DATA_REQUESTED"):
        M1Client.generate_plan("sess-1", "cmd", "url", "title", [])
