# PRIVAGENT Vision Transformer (ViT) Module

## Overview
This module integrates an on-device Vision Transformer (`onnx-community/vit-tiny-patch16-224-ONNX`) into the PRIVAGENT M3 extension. It runs within the Chrome MV3 Offscreen Document to provide visual semantic context (scene labeling) without exposing raw visual data to external APIs.

## Architecture
- **Inference Runtime:** `@huggingface/transformers` using ONNX Runtime.
- **Hardware Acceleration:** Attempts `webgpu` first. Falls back to `wasm` if WebGPU is unavailable or disabled.
- **Data Locality:** Assets are bundled directly into the extension during the `prebuild` phase. Network requests are strictly disabled during inference (`env.allowRemoteModels = false`).

## Privacy Boundaries (M2 Guard Integration)
1. **No Raw Pixels:** The ViT module returns semantic labels and scores (e.g., `[ { label: 'invoice', score: 0.95 } ]`). It never returns image data, base64 dataUrls, bounding boxes, or OCR text.
2. **M2 Validation:** The `visualPerception` metadata output by this module is explicitly passed through the M2 `PrivacyGuardCoordinator`.
3. **Fail-safe Design:** If the ViT module fails to initialize (e.g., incompatible hardware or restricted permissions), it gracefully degrades by returning an empty schema (`available: false`). The main OCR pipeline (M4) and privacy guard (M2) continue unaffected.

## Development & Build
- `npm run prebuild`: Executes `scripts/download-vit-assets.js` to download the pinned ViT ONNX model assets and verify their SHA-256 checksums.
- `vitVision.test.ts`: Validates initialization states and the strict output schema constraint, ensuring zero data leakage even on failure.

## Limitations
- **Resolution:** The model (`vit-tiny-patch16-224`) operates on 224x224 patches. Complex UI components might be abstracted into general document classifications.
- **Scope:** This module performs semantic tagging, not UI object detection. For interactable UI elements, the M3 DOM parsing logic remains authoritative.
