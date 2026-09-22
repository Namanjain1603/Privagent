/**
 * PRIVAGENT - Privacy-First Visual Browser Agent
 * SIH26171 — On-device Visual Perception for Light-weight Browser Agents
 * 
 * Module: M2 (Privacy & PII Guard)
 * Strict JSON Data Contracts & Type Definitions
 */

export type PIICategory = 
  | 'CREDIT_CARD'
  | 'AADHAAR_NUMBER'
  | 'PAN_NUMBER'
  | 'EMAIL_ADDRESS'
  | 'PHONE_NUMBER'
  | 'PERSON_NAME'
  | 'PASSWORD_SECRET'
  | 'OTP'
  | 'BANK_ACCOUNT'
  | 'IFSC_CODE'
  | 'STREET_ADDRESS'
  | 'MEDICAL_DATA'
  | 'CVV';

export type DetectionSource = 'DOM_ATTRIBUTE' | 'DOM_TEXT' | 'OCR_VISION' | 'REGEX_RULE';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedEntity {
  id: string;
  category: PIICategory;
  rawText: string;
  token: string;
  confidence: number; // 0.0 - 1.0
  source: DetectionSource;
  domSelector?: string;
  bbox?: BoundingBox;
  ruleMatched?: string;
  isVerified: boolean;
}

export interface RedactionPolicy {
  mode: 'CONSERVATIVE' | 'BALANCED' | 'MINIMAL';
  confidenceThreshold: number; // Entities >= this threshold will be redacted
  paddingPixels: number; // Visual bounding box expansion margin (prevent edge leaks)
  redactionStyle: 'SOLID_BLACK' | 'SOLID_DARK_LABEL' | 'PIXELATED' | 'BLUR';
  preserveTokenFormat: boolean; // Use <PII:CATEGORY_INDEX> for agent reasoning
  enabledCategories: Record<PIICategory, boolean>;
  blockedHtmlTags: string[]; // e.g., ['script', 'style', 'noscript', 'meta']
}

export interface SanitizedDOMNode {
  tag: string;
  attributes: Record<string, string>;
  text?: string;
  sanitizedText?: string;
  selector: string;
  isRedacted: boolean;
  redactedTokens?: string[];
  children?: SanitizedDOMNode[];
}

/**
 * CONTRACT 1: M4 (OCR & Vision) -> M2 (Privacy & PII Guard)
 * Raw visual artifacts from on-device capture
 */
export interface M4VisualInputContract {
  sessionId: string;
  timestamp: number;
  pageUrl: string;
  viewport: { width: number; height: number };
  screenshotBase64: string; // Captured by M4 on-device
  ocrDetections: Array<{
    text: string;
    bbox: BoundingBox;
    confidence: number;
  }>;
}

/**
 * CONTRACT 2: M3 (Browser / DOM) -> M2 (Privacy & PII Guard)
 * Raw page DOM state from Chrome extension / browser content script
 */
export interface M3DOMInputContract {
  sessionId: string;
  url: string;
  title: string;
  rawDomTree?: {
    tag: string;
    attributes: Record<string, string>;
    text?: string;
    selector: string;
    rect?: BoundingBox;
    children?: any[];
  };
  interactableElements: Array<{
    id: string;
    selector: string;
    type: string; // 'button' | 'input' | 'select' | 'a'
    label?: string;
    value?: string;
    bbox?: BoundingBox;
  }>;
}

/**
 * CONTRACT 3: M2 (Privacy & PII Guard) -> M1 (AI Agent Brain / Cloud)
 * THE ONLY PAYLOAD TRANSMITTED TO CLOUD.
 * MUST GUARANTEE ZERO RAW SENSITIVE DATA.
 */
export interface M2OutboundSanitizedPayload {
  sessionId: string;
  timestamp: number;
  pageMetadata: {
    domain: string;
    sanitizedTitle: string;
    viewport: { width: number; height: number };
  };
  sanitizedDomSkeleton: string; // Compressed, PII-tokenized DOM representation
  sanitizedElements: Array<{
    id: string;
    type: string;
    label?: string;
    value?: string;
    options?: string[];
    selector?: string;
    disabled?: boolean;
    required?: boolean;
  }>;
  redactedScreenshotBase64: string; // Canvas-redacted image with solid boxes over sensitive areas
  detectedTokenList: Array<{
    token: string;
    category: PIICategory;
    purposeHint: string; // e.g. "Cardholder field" or "Primary contact email"
  }>;
  policyVersion: string;
  verificationSignature: string; // HMAC/Hash proving pre-flight verification passed
}

/**
 * Safe Browser Actions allowable from M1
 */
export type AllowedActionType = 'CLICK' | 'TYPE' | 'SELECT' | 'SCROLL' | 'NAVIGATE' | 'WAIT';

export interface AgentActionProposal {
  actionId: string;
  type: AllowedActionType;
  targetSelector: string;
  targetToken?: string; // If typing or selecting a tokenized item (e.g. "<PII:CREDIT_CARD_1>")
  rawTextValue?: string; // Non-sensitive value or token
  coordinates?: { x: number; y: number };
  scrollDelta?: { dx: number; dy: number };
  targetUrl?: string; // For NAVIGATE
  justification: string;
}

/**
 * CONTRACT 4: M1 -> M2 (Action Validation) -> M3 (Execution in Browser)
 */
export interface M2ActionValidationResult {
  isAllowed: boolean;
  actionId: string;
  sanitizedAction?: {
    type: AllowedActionType;
    selector: string;
    resolvedExecutionValue?: string; // Token resolved back to real local value strictly in memory
    coordinates?: { x: number; y: number };
    scrollDelta?: { dx: number; dy: number };
    targetUrl?: string;
  };
  rejectionReason?: string;
  securityFlagsTriggered: string[];
}

/**
 * CONTRACT 5: M2 -> M5/M6 Audit Logging
 */
export interface PrivacyAuditRecord {
  id: string;
  timestamp: number;
  sessionId: string;
  detectedCount: number;
  redactedCount: number;
  categoriesFound: PIICategory[];
  preFlightVerificationStatus: 'PASSED' | 'FAILED_BLOCKED';
  potentialLeakPrevented: boolean;
  executionDurationMs: number;
}
