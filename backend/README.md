# PRIVAGENT — Privacy-First Visual Browser Agent (SIH 2026)
**Problem Statement SIH26171**: On-device Visual Perception for Light-weight Browser Agents

---

## Member 5 (M5) — Backend, Database & Security Gateway

PRIVAGENT M5 provides the secure communication backbone, Zero-Trust action validation engine, session lifecycle persistence, and privacy boundary enforcement connecting the Chrome Extension (M3), On-Device Privacy Guard (M2), AI Brain (M1), and Dashboard (M6).

---

## Architecture Flow

```
[M3 Chrome Extension] ──► Captures page DOM & screenshot
       │
       ▼
[M4 Local OCR / Vision] ──► Visual token extraction
       │
       ▼
[M2 Local Privacy Guard] ──► On-device masking of Aadhaar/PAN/passwords
       │ (redaction_verified: true)
       ▼
┌────────────────────────────────────────────────────────┐
│               M5 FASTAPI BACKEND GATEWAY               │
│                                                        │
│  1. Privacy Ingestion Gate (POST /analyze)             │
│  2. Cloud Minimization (Strips IDs, top 25 DOM only)   │
│  3. Zero-Trust Security Gate (Allowlist only)          │
│  4. SQLite Concurrency (WAL Mode Persistence)          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
                  [M1 Cloud AI Brain]
                           │ (Structured ActionPlan)
                           ▼
                 [M5 Security Validator]
                           │ (CLICK, TYPE, SELECT, SCROLL, NAVIGATE)
                           ▼
                [M3 Chrome Extension] (Executes safe action)
                           │
                           ▼
                 [M5 Telemetry Engine] (Masked TYPE values)
                           │
                           ▼
                [M6 Observability Dashboard]
```

---

## Quick Start (Clean Environment)

```bash
# 1. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch Backend
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# 4. Verify Health & Readiness
curl -s http://localhost:8000/health/ready
```

---

## Automated Test Execution

```bash
pytest backend/tests/ -v
```

---

## Security & Privacy Guarantees
- **Zero Raw Secrets Stored**: Passwords, OTPs, Aadhaar, PAN, and payment cards are blocked at the ingestion boundary.
- **Fail-Closed Action Allowlist**: Only `CLICK`, `TYPE`, `SELECT`, `SCROLL`, and `NAVIGATE` can execute. Arbitrary JavaScript (`<script>`, `eval()`, `javascript:`) is strictly blocked.
- **Deterministic DEMO_MODE**: Guaranteed 100% demo uptime for jury presentation without third-party network dependency.
