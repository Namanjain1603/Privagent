# PRIVAGENT — SIH 2026 Presentation Demo Runbook

## 1. Pre-Demo Setup (2 Minutes Before Pitch)
1. Launch the backend:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. Verify system readiness:
   ```bash
   curl -s http://localhost:8000/health/ready
   # Expected: {"status":"READY","database":"CONNECTED","environment":"development"}
   ```
3. Load unpacked PRIVAGENT Chrome Extension in Developer Mode.
4. Verify extension connects to `http://localhost:8000`.

---

## 2. Live Demo Script (Step-by-Step for Jury)
1. **Explain the Problem (SIH26171)**: Traditional browser agents send full DOM and raw screenshots to cloud LLMs, leaking passwords and personal documents.
2. **Show PRIVAGENT Solution**: PRIVAGENT does local perception (M4) + local PII masking (M2) on-device.
3. **Execute Live Task**:
   - In Extension popup, enter: `"Search for EV charging stations near Connaught Place"`.
   - Click **Run Agent**.
4. **Demonstrate Privacy Ingestion (M5)**: Show that `POST /analyze` accepted the context with `redaction_verified: true` and 0 raw secrets logged.
5. **Demonstrate AI Planning**: Show that `POST /plan` produced a structured ActionPlan (`TYPE` -> `CLICK` -> `SCROLL`).
6. **Demonstrate Zero-Trust Validation**: Show that the backend validated all selectors and blocked unauthorized script executions.
7. **Demonstrate Browser Execution**: The browser automatically types into the search box and navigates to the result.
8. **Show Telemetry (M6)**: Open `http://localhost:8000/observability/metrics` showing average execution latency (~3ms) and zero data leaks.

---

## 3. Emergency Troubleshooting Matrix

| Issue | Quick Fix |
| :--- | :--- |
| **WiFi / Internet Lag** | Backend automatically runs in `DEMO_MODE=true` with deterministic mock AI. The demo will not freeze! |
| **Backend Not Running** | Run `uvicorn backend.main:app --port 8000 --reload` in terminal. |
| **Extension Disconnected** | Click the PRIVAGENT icon in Chrome and click **New Session**. |
| **Database Corrupted** | Delete `privagent.db` and restart backend; tables will auto-initialize cleanly. |
