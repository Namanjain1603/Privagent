/**
 * PRIVAGENT - Privacy-First Visual Browser Agent
 * SIH 2026 Problem Statement: SIH26171
 * 
 * Member 4 Module: OCR & Vision
 * Standardized Data Contracts & Types
 */

export interface BoundingBox {
  /** Top-left X coordinate in original screenshot pixels */
  x: number;
  /** Top-left Y coordinate in original screenshot pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

export interface NormalizedBoundingBox {
  /** Relative X coordinate [0.0 to 1.0] from left */
  normalizedX: number;
  /** Relative Y coordinate [0.0 to 1.0] from top */
  normalizedY: number;
  /** Relative width [0.0 to 1.0] */
  normalizedWidth: number;
  /** Relative height [0.0 to 1.0] */
  normalizedHeight: number;
}

export type DetectionType = 'word' | 'line' | 'block';

export type SensitiveSignalType =
  | 'email'
  | 'phone'
  | 'pan_card'
  | 'aadhaar_card'
  | 'credit_card'
  | 'custom_regex';

export interface SensitiveSignal {
  type: SensitiveSignalType;
  patternName: string;
  matchedSnippet: string;
  confidence: number;
  note: string;
}

export interface OcrDetection {
  id: string;
  text: string;
  type: DetectionType;
  boundingBox: BoundingBox;
  normalizedBox: NormalizedBoundingBox;
  /** Center click point in browser CSS viewport coordinates (clickPoint / devicePixelRatio) */
  viewportClickPoint?: {
    x: number;
    y: number;
  };
  /** Confidence score between 0 and 100 */
  confidence: number;
  lineIndex?: number;
  wordIndex?: number;
  blockIndex?: number;
  /** Optional heuristic demonstration signal (Pre-M2 Privacy Guard) */
  sensitiveSignal?: SensitiveSignal;
}

export interface OcrProcessingOptions {
  language?: string;
  granularity: 'words' | 'lines' | 'both';
  enhanceContrast: boolean;
  binarize: boolean;
  detectSensitiveDemonstration: boolean;
  /** Device Pixel Ratio (default: window.devicePixelRatio || 1) for M3 viewport coordinate calculation */
  devicePixelRatio?: number;
}

export interface OcrProgressStatus {
  phase: 'initializing' | 'loading_model' | 'recognizing' | 'normalizing' | 'completed' | 'error';
  progress: number; // 0 to 100
  message: string;
}

export interface ImageMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  width: number;
  height: number;
  aspectRatio: number;
  /** Browser device pixel ratio at capture time (default: 1) */
  devicePixelRatio?: number;
  dataUrl?: string;
}

export interface PrivacyAuditGuarantee {
  localInBrowser: boolean;
  remoteVisionApiCalled: boolean;
  screenshotSentToBackend: boolean;
  telemetrySent: boolean;
  wasmExecution: boolean;
  auditTimestamp: string;
}

export interface OcrResultBundle {
  metadata: {
    imageFileName: string;
    imageWidth: number;
    imageHeight: number;
    fileSize: number;
    fileType: string;
    /** Browser device pixel ratio at capture time */
    devicePixelRatio: number;
    /** Browser CSS viewport width (imageWidth / devicePixelRatio) */
    viewportWidth: number;
    /** Browser CSS viewport height (imageHeight / devicePixelRatio) */
    viewportHeight: number;
    processingTimeMs: number;
    timestamp: string;
    engine: string;
    version: string;
  };
  fullText: string;
  detections: OcrDetection[];
  summary: {
    totalDetections: number;
    wordCount: number;
    lineCount: number;
    averageConfidence: number;
    heuristicFlaggedCount: number;
  };
  privacyGuarantee: PrivacyAuditGuarantee;
}

/**
 * Interface contract for Member 2 (Privacy Guard & Redaction Module)
 */
export interface M2PrivacyGuardInputContract {
  moduleSource: 'M4_OCR_AND_VISION';
  imageDimensions: {
    width: number;
    height: number;
    devicePixelRatio: number;
    viewportWidth: number;
    viewportHeight: number;
  };
  rawDetections: OcrDetection[];
  provisionalSignals: {
    detectionId: string;
    type: SensitiveSignalType;
    text: string;
    boundingBox: BoundingBox;
  }[];
}

/**
 * Interface contract for Member 1 (Agent Reasoning & Planning Module)
 */
export interface M1AgentPlannerInputContract {
  visualElements: {
    id: string;
    text: string;
    coordinates: BoundingBox;
    normalizedCoordinates: NormalizedBoundingBox;
    viewportClickPoint?: { x: number; y: number };
    confidence: number;
    isRedactedOrSensitive?: boolean;
  }[];
}

/**
 * Interface contract for Member 3 (Browser Automation & Action Module)
 */
export interface M3BrowserActionTarget {
  targetElementId?: string;
  /** Center click point in native screenshot pixels (e.g. 1280, 800) */
  clickPoint: { x: number; y: number };
  /** Center click point in browser CSS viewport coordinates (clickPoint / devicePixelRatio, e.g. 640, 400) */
  viewportClickPoint: { x: number; y: number };
  /** Normalized coordinate click point [0.0 - 1.0] (NOT divided by DPR, e.g. 0.5, 0.5) */
  normalizedClickPoint: { x: number; y: number };
  /** Browser device pixel ratio used for calculation */
  devicePixelRatio: number;
  expectedText: string;
}
