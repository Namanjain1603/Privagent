# OPTION B PRODUCTIZATION AUDIT

## 1. Executive Summary
This report presents a comprehensive, read-only architectural and compatibility audit of the PRIVAGENT system to evaluate its transition to **OPTION B — PURE / USER-INSTALLABLE CHROME EXTENSION PRODUCT**. The audit confirms that the core modules (M2 Privacy Guard, M4 OCR) rely entirely on client-side capabilities (TypeScript, HTML5 Canvas, Web Workers, WASM) without Node.js dependencies, making them highly compatible with Chrome Manifest V3 (MV3). However, the current extension (M3) heavily depends on a local WebSocket bridge (`ws://localhost:3000`) and the M5 backend for orchestration. Productization will require bundling M2 and M4 directly into the M3 build pipeline, migrating M5/M1 to a remote server, and updating M3's network target, without altering the validated core logic or API contracts.

## 2. Current Architecture
- **M1 (AI Brain)**: Standalone Node.js/Express server (port 3001). Holds the Gemini API key and handles LLM reasoning.
- **M2 (Privacy Guard)**: Standalone Vite/React project (`privacy/`). Core logic resides in pure TypeScript modules (`src/modules/`).
- **M3 (Browser Agent)**: Chrome MV3 Extension (`extension/`). Extracts DOM and establishes a WebSocket connection to `ws://localhost:3000` via `LocalBridge`.
- **M4 (OCR & Vision)**: Standalone Vite/React project (`ocr/`). Uses `tesseract.js` for local in-browser OCR.
- **M5 (Backend Gateway)**: Python FastAPI server. Exposes a WebSocket server on port 3000 (which acts as the bridge for M3) and an HTTP API on port 8000. It orchestrates the flow from M3 to M1.
- **M6 (Dashboard)**: Standalone Vite/React dashboard for telemetry viewing.

**Flow:** M3 Extension -> `ws://localhost:3000` (M5) -> M5 HTTP -> `http://localhost:3001` (M1) -> M5 WS -> M3 Extension. M2 and M4 are either manually triggered or mocked in the local pipeline (e.g., via `smoke-test-bridge.ts`).

## 3. Target Option-B Architecture
- **Local (User-Installable Chrome Extension)**: M3 + M2 + M4. The extension extracts the DOM, applies M2 privacy masking locally (and optionally runs M4 OCR locally), then securely transmits the *sanitized* context to the remote backend.
- **Remote (Cloud Infrastructure)**: M5 + M1. M5 handles connection management, telemetry, and security validation, then proxies sanitized requests to M1 for Gemini reasoning. M1 securely holds the API keys.

**Flow:** M3 (Extension w/ M2+M4 bundled) -> Secure WSS/HTTPS -> Remote M5 -> Remote M1 -> Remote M5 -> M3.

## 4. Actual Repository Structure
- `backend/` -> Contains the M5 Python FastAPI backend (`backend/backend/`) and some Node scripts.
- `brain/m1-brain/` -> Contains the M1 Node.js/Express application.
- `dashboard/` -> Contains the M6 Telemetry Dashboard (React/Vite).
- `extension/` -> Contains the M3 Chrome Extension MV3 (Webpack).
- `ocr/` -> Contains the M4 OCR module (React/Vite).
- `privacy/` -> Contains the M2 Privacy module (React/Vite).
- `smoke-test-bridge.ts` -> E2E orchestration smoke test.

## 5. M1 Audit
- **Location**: `brain/m1-brain/`
- **Implementation**: Node.js + Express (`src/index.ts`).
- **Port**: 3001
- **API**: `POST /api/m1/plan`
- **Dependencies**: `@google/genai`, `express`, `zod`. Node server runtime is absolutely required.
- **Conclusion**: Must remain a remote service. It securely holds the `GEMINI_API_KEY` in its environment. Bundling it into the extension would leak the key and violate security requirements. Can remain remotely deployed without code changes.

## 6. M2 Audit
- **Location**: `privacy/src/modules/`
- **Implementation**: Pure TypeScript (e.g., `piiDetector.ts`, `maskingEngine.ts`, `visualRedactor.ts`). Uses standard browser APIs (HTML5 Canvas) for visual redaction.
- **Dependencies**: No Node-specific APIs (`fs`, `path`, etc.) detected.
- **Conclusion**: Highly compatible with the extension. The TS modules can be imported directly into the M3 extension's build process.

## 7. M3 Audit
- **Location**: `extension/`
- **Implementation**: Chrome Manifest V3 (MV3). Uses `service-worker.ts`, `content-script.ts`, `local-bridge.ts`.
- **Dependencies**: Currently hardcoded to connect to `ws://localhost:3000` via `LocalBridge`.
- **Conclusion**: Can run entirely inside MV3. Requires removing the `localhost` hardcode and pointing it to the production M5 WebSocket URL. Must import M2 and M4 into its Webpack pipeline.

## 8. M4 Audit
- **Location**: `ocr/src/services/`
- **Implementation**: Uses `tesseract.js@7.0.0` for WASM-based local OCR execution (`ocrService.ts`).
- **Dependencies**: Tesseract requires downloading a worker script and WASM core.
- **Conclusion**: Compatible with MV3, but requires specific build-time bundling. Tesseract assets (worker, core WASM, language data) MUST be packaged locally inside the extension and declared in `web_accessible_resources`. Fetching WASM from external CDNs (like unpkg) will be blocked by MV3's strict Content Security Policy (CSP).

## 9. M5 Audit
- **Location**: `backend/backend/`
- **Implementation**: Python FastAPI.
- **Endpoints**: `/analyze`, `/plan`, `/validate-action`, `/telemetry`, `/health`, and a WebSocket endpoint (`/ws` on port 3000).
- **CORS**: Currently allows `chrome-extension://.*`, `localhost`, and `127.0.0.1`.
- **Conclusion**: Must be deployed remotely. Required by the extension for telemetry, AI reasoning proxying, and session tracking.

## 10. M6 Audit
- **Location**: `dashboard/`
- **Conclusion**: Only used for telemetry visualization and testing. Not required for the user-facing extension. Do not bundle.

## 11. Chrome MV3 Audit
- **Manifest**: Clean and compliant.
- **Permissions**: `activeTab`, `scripting`, `storage`.
- **Host Permissions**: `<all_urls>`.
- **Blockers**: No `content_security_policy` or `web_accessible_resources` defined yet. This is a blocker for bundling M4 (Tesseract WASM) which requires `web_accessible_resources` to load local WASM files in MV3.

## 12. Localhost Dependency Map
- `ws://localhost:3000`: Used by M3 `LocalBridge` and `smoke-test-bridge.ts`. Provided by M5 `websocket_server.py`. (Must migrate to remote WSS).
- `http://localhost:8000`: Used by Dashboard and tests to hit M5. (Must migrate to remote API).
- `http://localhost:3001`: Used by M5 to hit M1. (Must migrate to remote internal networking).

## 13. Remote Dependency Map
- **Gemini API**: Called solely by M1. Must remain remote.

## 14. Security Audit
- **API Keys**: `GEMINI_API_KEY` is safely isolated in `brain/m1-brain/src/config/env.ts` (loaded via `process.env`). It is NOT present in the extension or privacy modules.
- **Dynamic Execution**: No `eval`, `new Function`, or `chrome.scripting.executeScript` found in the extension execution paths. (A regex check for `eval` exists in M1's `planner.ts`, acting as a safety guard).
- **Logging**: M5 uses `safe_log_message` in `websocket_server.py` which explicitly avoids logging PII or raw payloads. `test_e2e_integration.py` confirms that passwords are not logged.
- **Conclusion**: Current architecture adheres strictly to security requirements.

## 15. API Contract Audit
- **WS Envelope**: `{ requestId, message: { type, ... } }`. Used for `DOM_RESPONSE`, `ACTION_REQUEST`, `ACTION_RESULT`.
- **M5 -> M1**: `POST /plan` uses `M1PlanRequestSchema` (session_id, user_goal, current_url, sanitized_elements).
- **Conclusion**: No contract changes are required. The extension will simply emit the identical `DOM_RESPONSE` payload (but sanitized locally first).

## 16. Build & Packaging Audit
- **Current Build**: M3 uses Webpack (`extension/webpack.config.js`). M2 and M4 use Vite independently.
- **Required Build Steps**:
  1. Add M2 and M4 source paths to Webpack resolution.
  2. Copy Tesseract static assets (worker.js, core.wasm, eng.traineddata) to `extension/dist/assets/`.
  3. Update `manifest.json` with `web_accessible_resources` for the Tesseract assets.
- **Bundle Size**: Tesseract WASM + traineddata is typically ~3-5MB. This is acceptable for a Chrome extension.

## 17. Required Changes

| Module | Required Change | Classification |
|---|---|---|
| **M3 (Extension)** | Modify `LocalBridge` to connect to a production WSS URL (via env var). | [REQUIRED] |
| **M3 (Extension)** | Import M2 (`privacyGuardCoordinator.ts`) into `service-worker.ts` or `content-script.ts` to sanitize DOM locally. | [REQUIRED] |
| **M3 (Extension)** | Update `manifest.json` to include Tesseract static assets in `web_accessible_resources`. | [REQUIRED] |
| **M3 (Extension)** | Update `webpack.config.js` to compile M2 and M4 alongside M3, and copy WASM assets. | [REQUIRED] |
| **M4 (OCR)** | Configure `configureOcrAssets` to point to `chrome.runtime.getURL()` paths for local WASM assets. | [REQUIRED] |
| **M5 (Backend)** | Deploy to a remote server with HTTPS/WSS enabled. | [REQUIRED] |

## 18. Files That MUST NOT Be Changed
- Production logic in `brain/m1-brain/src/` (M1 logic).
- Production logic in `privacy/src/modules/` (M2 logic).
- Production logic in `ocr/src/services/` (M4 logic).
- Fast API routes and models in `backend/backend/` (M5 logic).
- API schema definitions across all modules.

## 19. Migration Risks
- **MV3 WASM Execution**: Chrome MV3 has strict rules around WASM execution. Tesseract relies on WASM. If not correctly placed in `web_accessible_resources` and instantiated within a Web Worker or offscreen document, MV3 may block it.
  - *Safest approach*: Use MV3 Offscreen Documents (`chrome.offscreen`) if standard Web Workers fail to load the WASM context.
- **Bundle Size/Memory**: Running OCR (M4) in the background service worker might exceed MV3 service worker memory limits or timeout limits (5 minutes). Offscreen Documents are the recommended fallback.

## 20. Recommended Migration Order
1. **Infrastructure**: Deploy M1 and M5 to staging remote servers.
2. **Build Tooling**: Update M3's `webpack.config.js` to import M2 and M4, and copy static assets.
3. **M3 Integration**: Wire M2's `PrivacyGuardCoordinator` into M3's `content-script.ts` (or `service-worker.ts`).
4. **Network Cutover**: Change `LocalBridge` WSS URL to the staging M5 server.
5. **Validation**: Run the existing E2E integration tests against the bundled extension and remote backend.

## 21. Final Go / No-Go Assessment
**GO**. The system architecture cleanly separates concerns. M2 and M4 are heavily decoupled and written in pure TypeScript/Browser APIs, making them excellent candidates for local bundling inside M3. M1 and M5 are stateless (or DB-backed) network services that can be trivially hosted remotely. The only significant engineering effort involves Webpack bundling and MV3 WASM compliance.

---
### AUDIT STATUS:
PRODUCTION CODE MODIFIED: NO
FILES MODIFIED: NONE
DEPENDENCIES MODIFIED: NO
ARCHITECTURE MODIFIED: NO

| Module | Current Runtime | Target Runtime | Blockers | Required Changes |
|---|---|---|---|---|
| **M1** | Node.js (Local port 3001) | Node.js (Remote Cloud) | None | Deploy remotely. |
| **M2** | Vite/React (Local dev) | Chrome Extension (MV3) | None | Bundle into M3 via Webpack. |
| **M3** | Chrome Extension (MV3) | Chrome Extension (MV3) | Hardcoded `localhost` WS | Update WS target; Integrate M2. |
| **M4** | Vite/React (Local dev) | Chrome Extension (MV3) | Remote WASM loading blocked | Bundle assets; Configure local paths; Add MV3 CSP/WAR. |
| **M5** | Python/FastAPI (Local port 8000/3000) | Python/FastAPI (Remote Cloud) | None | Deploy remotely with WSS/HTTPS. |
| **M6** | Vite/React (Local dev) | N/A | N/A | [NOT REQUIRED] |
