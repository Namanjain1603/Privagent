# PRIVAGENT — REST API Specification (FROZEN FOR SIH DEMO)
**Problem Statement SIH26171**: On-device Visual Perception for Light-weight Browser Agents

---

## 1. System Health & Readiness

### `GET /health`
- **Description**: Lightweight liveness check.
- **Response**:
```json
{
  "status": "ok",
  "service": "privagent-backend",
  "demo_mode": true,
  "timestamp": 1726900000.0
}
```

### `GET /health/ready`
- **Description**: Verifies database connection and AI configuration readiness.
- **Response**:
```json
{
  "status": "READY",
  "database": "CONNECTED",
  "environment": "development"
}
```

---

## 2. Session Management

### `POST /session`
- **Request Body**:
```json
{
  "session_id": "sess_demo_101",
  "user_task": "Find top EV charging spots"
}
```
- **Response (201 Created)**:
```json
{
  "session_id": "sess_demo_101",
  "status": "ACTIVE",
  "workflow_status": "IDLE",
  "created_at": "2026-09-21T07:30:00.000000",
  "updated_at": "2026-09-21T07:30:00.000000",
  "action_count": 0,
  "error_count": 0,
  "redacted_token_count": 0,
  "user_task": "Find top EV charging spots",
  "metadata": {}
}
```

### `GET /session/{session_id}`
- **Response (200 OK)**:
Returns identical `SessionResponse` envelope.

### `PATCH /session/{session_id}/complete`
- **Response (200 OK)**:
Marks session as `COMPLETED`.

### `PATCH /session/{session_id}/fail`
- **Response (200 OK)**:
Marks session as `FAILED`.

---

## 3. Perception & Privacy Ingestion

### `POST /analyze`
- **Request Body**:
```json
{
  "session_id": "sess_demo_101",
  "url": "https://service.gov.in/portal",
  "page_title": "Portal Home",
  "sanitized_context": {
    "redaction_verified": true,
    "redacted_token_count": 2,
    "elements": [
      {
        "tag": "input",
        "selector": "#search-field",
        "label": "Search Query",
        "is_interactive": true
      }
    ]
  }
}
```
- **Response (200 OK)**:
```json
{
  "status": "ACCEPTED",
  "session_id": "sess_demo_101",
  "sanitized_element_count": 1,
  "privacy_verified": true,
  "summary": "Context accepted and verified safe with 1 interactive DOM elements.",
  "server_timestamp": "2026-09-21T07:30:01.000000"
}
```

---

## 4. AI Planning & Action Validation

### `POST /plan`
- **Request Body**:
```json
{
  "session_id": "sess_demo_101",
  "user_goal": "Find top EV charging spots",
  "current_url": "https://service.gov.in/portal",
  "sanitized_elements": [
    { "tag": "input", "selector": "#search-field" }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "status": "SUCCESS",
  "session_id": "sess_demo_101",
  "action_plan": {
    "plan_id": "plan_9a1b2c3d",
    "session_id": "sess_demo_101",
    "actions": [
      {
        "type": "TYPE",
        "target": "#search-input",
        "value": "EV charging stations near Connaught Place",
        "description": "Enter search term"
      },
      {
        "type": "CLICK",
        "target": "#submit-search",
        "value": null,
        "description": "Submit search form"
      }
    ],
    "total_actions": 2,
    "confidence": 0.96,
    "reasoning_summary": "Automated workflow decomposition for: 'Find top EV charging spots...'"
  },
  "validation_status": "ALL_ACTIONS_APPROVED"
}
```

### `POST /validate-action`
- **Request Body**:
```json
{
  "session_id": "sess_demo_101",
  "action": {
    "type": "CLICK",
    "target": "#submit-search"
  }
}
```
- **Response (200 OK)**:
```json
{
  "is_safe": true,
  "rejection_reason": null,
  "action_type": "CLICK",
  "validated_target": "#submit-search"
}
```

---

## 5. Telemetry & Observability

### `POST /telemetry`
- **Request Body**:
```json
{
  "session_id": "sess_demo_101",
  "event_type": "ACTION_EXECUTED",
  "component": "CHROME_EXTENSION",
  "action_type": "CLICK",
  "execution_time_ms": 28.5,
  "success": true,
  "details": { "target": "#submit-search" }
}
```

### `GET /observability/metrics`
- **Response (200 OK)**:
Returns real-time session, telemetry, and security audit statistics.
