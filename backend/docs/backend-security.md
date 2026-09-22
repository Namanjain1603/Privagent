# PRIVAGENT — Backend Security Architecture (SIH 2026)

## 1. Zero-Trust Security Philosophy
Every external input is untrusted:
1. **Extension input is untrusted**: All incoming JSON is inspected by Pydantic models with explicit length limits, regex formats, and `extra = "forbid"`.
2. **Page context is untrusted**: DOM elements undergo synthetic PII pattern detection (Aadhaar, PAN, card numbers) before acceptance.
3. **AI output is untrusted**: Raw AI tokens are parsed into structured schemas and vetted against a fail-closed allowlist before transmission to the browser.

## 2. Action Allowlist (Strictly 5 Allowed Actions)
- `CLICK`
- `TYPE`
- `SELECT`
- `SCROLL`
- `NAVIGATE`

**Disallowed Action Types**: `EXECUTE_JS`, `RUN_CODE`, `EVAL`, `SHELL`, `COMMAND`, `PYTHON`, `BASH`, `POWERSHELL`.

## 3. Script & Protocol Injection Defense
- **Banned Schemes**: `javascript:`, `data:`, `file:`, `vbscript:`, `chrome:`, `about:`, `chrome-extension:`. Only `http://` and `https://` are permitted.
- **Embedded Script Detection**: Inline `<script>`, `onload=`, `onerror=`, `onclick=`, and `eval()` keywords in targets or values are blocked.
- **TYPE Value Masking**: Values typed into form fields are stripped of secrets in telemetry (`{"action_type": "TYPE", "value_present": true}`).

## 4. Database Safety
- SQLite parameterized ORM queries via SQLAlchemy protect against SQL injection.
- Session IDs are constrained to `^[a-zA-Z0-9_\-]+$`, eliminating directory traversal and SQL quote escapes.
