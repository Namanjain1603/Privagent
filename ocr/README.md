# PRIVAGENT — OCR & Vision Module (Member 4)
**Privacy-First Visual Browser Agent for SIH 2026 (Problem Statement: SIH26171)**

---

## 1. Executive Summary & Module Scope
**PRIVAGENT** is a visual browser agent that automates web interactions with uncompromising privacy guarantees. 
This application represents **Member 4's standalone deliverable: OCR & Vision**.

### Member 4 Responsibilities:
- Ingest browser screenshots (from user upload or Member 3 browser capture).
- Perform **100% local, client-side Optical Character Recognition (OCR)** in the browser using Tesseract.js (WebAssembly & Web Worker).
- Extract recognized text with word- and line-level bounding box coordinates and statistical confidence metrics.
- Normalize coordinates against native screenshot dimensions into structured JSON.
- Provide responsive visual overlays with zoom, pan, highlighting, and click inspection.
- Demonstrate an optional local heuristic for flagging potential sensitive tokens (Email, Phone, PAN, Aadhaar formats) before handoff to Member 2 (Privacy Guard).
- Export structured results as JSON, TXT, and CSV without external network reliance.

---

## 2. Privacy & Security Architecture
- **Zero Cloud Vision APIs**: Does NOT transmit screenshots or recognized text strings to any remote server (Google Vision, AWS Rekognition, Azure, or private backends).
- **In-Browser WebAssembly**: Tesseract.js compiles and runs inside an isolated browser Web Worker.
- **Language Data Handling**: Static language dictionaries (`eng.traineddata.gz`) are downloaded via CDN once into browser IndexedDB cache. This is purely inbound network caching; no user pixels or OCR data ever leave the client.
- **Console Privacy**: OCR texts and detected tokens are suppressed from console logs.
- **Ephemeral Session**: Resetting or closing the tab clears all canvas buffers and memory.

---

## 3. Technology Stack & Dependencies
- **Frontend Framework**: React 19 with TypeScript
- **Build System**: Vite
- **Styling**: Tailwind CSS
- **OCR Engine**: Tesseract.js v7 (WASM / Web Worker)
- **Visual Canvas**: HTML5 Canvas (Image rendering, offscreen preprocessing, adaptive contrast/binarization)
- **Icons**: Lucide React

---

## 4. Getting Started & Execution

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### Building for Production
```bash
npm run build
```

---

## 5. Synthetic Test Procedure (Zero Real PII)
To evaluate the application without exposing real personal or corporate data, use the built-in synthetic test workflow:

1. **Launch the Application**: The app loads a synthetic **KYC & Verification Form** screenshot automatically on initial launch.
2. **Review Image Metadata**: Note the rendered dimensions (e.g. `960 × 640 px`) and synthetic file status.
3. **Configure Options**:
   - Granularity: Select **Lines** or **Words**.
   - Canvas Preprocessing: Toggle **Contrast Boost** or **Binarize (Adaptive)**.
   - Demonstration Signals: Ensure **Sensitive-Data Region Signals (Demo)** is checked.
4. **Execute OCR**: Click **"Execute Local OCR on Screenshot"**.
5. **Observe Local Progress**:
   - Step 1: Initializing local WebAssembly worker.
   - Step 2: Loading language model weights.
   - Step 3: Text recognition and coordinate normalization.
6. **Interact with Results**:
   - Click bounding boxes on the canvas to inspect coordinates in the **Detection Inspector**.
   - Note the distinction between standard text (cyan/indigo) and heuristic matches (amber/red).
   - Test the search filter in the **Extracted Text Panel**.
   - Click **Copy Text** to copy recognized plain text.
7. **Export**:
   - Click **JSON Bundle** to download structured normalized coordinates.
   - Click **Plain Text (.txt)** or **CSV Table** for tabular analysis.
8. **Try Second Synthetic Preset**: Click **Load Synthetic Invoice** under the upload zone to test e-commerce invoice line items and card sequence heuristics.

---

## 6. Service Layer & Integration Contracts (M1 - M6)

The codebase isolates visual logic into a modular service layer ready for monorepo or package import:

### Service Functions:
```typescript
import { processScreenshot } from './services/ocrService';
import { normalizeOcrResults } from './services/detectionNormalizer';
import { detectPossibleSensitivePatterns } from './services/sensitiveSignals';
import { exportResultsAsJson } from './services/exportService';
```

### Team Integration Hand-Offs:
- **Member 3 (Browser Driver)**: Captures screenshot via Chrome Extension / CDP and feeds canvas or image URL into `processScreenshot()`.
- **Member 2 (Privacy Guard & Redaction)**: Ingests `OcrResultBundle.detections` and replaces heuristic signals with official PII masking policies.
- **Member 1 (Agent Planner)**: Uses normalized bounding boxes `[0..1]` and element text to construct browser action trees (e.g., Click, Fill, Scroll).
- **Member 5 (Backend)**: Audits zero-telemetry client-side attestations.
- **Member 6 (Integration & QA)**: Runs automated benchmark suites on synthetic datasets.

### Coordinate Convention:
- **Origin**: `(0, 0)` is strictly the **Top-Left** of the native unscaled screenshot.
- **Pixel Box**: `{ x, y, width, height }` in native screenshot pixels.
- **Normalized Box**: `{ normalizedX, normalizedY, normalizedWidth, normalizedHeight }` mapped from `0.0` to `1.0`.
- **Center Action Target**:
  ```typescript
  clickPoint = {
    x: Math.round(x + width / 2),
    y: Math.round(y + height / 2)
  };
  ```

---

## 7. Limitations & Disclaimers
1. **OCR Reliability**: Optical Character Recognition can misinterpret non-standard fonts, low contrast, or noisy backgrounds. Statistical confidence scores reflect engine certainty, not semantic truth.
2. **Heuristic Signals Disclaimer**: The sensitive-data pattern detector is an optional preview heuristic (using regex for email, phone, PAN, Aadhaar structures). It is **not** a verified identity detector or full PII classifier. Authoritative masking is managed by Member 2.
3. **Hardware Acceleration**: OCR execution speed depends on client CPU power and WebAssembly runtime support.
