import pytest
from fastapi import status
import backend.main as main_module


def test_health_endpoint(client):
    """1. Health check returns status, service identity, and demo mode."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "privagent-backend"
    assert "demo_mode" in data
    assert "timestamp" in data


def test_readiness_endpoint_connected(client):
    """2. Readiness check executes real DB query and returns READY / CONNECTED."""
    response = client.get("/health/ready")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "READY"
    assert data["database"] == "CONNECTED"
    assert "environment" in data


def test_readiness_endpoint_disconnected(client, monkeypatch):
    """2b. Readiness check returns 503 and DISCONNECTED if DB ping fails."""
    monkeypatch.setattr(main_module, "check_db_connection", lambda: False)
    response = client.get("/health/ready")
    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    data = response.json()
    assert data["status"] == "NOT_READY"
    assert data["database"] == "DISCONNECTED"


def test_observability_endpoint(client):
    """22. Observability endpoint returns structured metrics and security guarantees."""
    response = client.get("/observability/metrics")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "metrics" in data
    assert "sessions" in data
    assert "security" in data
    assert data["security"]["zero_leak_guarantee"] is True
