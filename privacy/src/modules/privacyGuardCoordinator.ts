/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Central Module Coordinator
 * 
 * Ties together:
 * - PIIDetector (Multi-modal algorithmic & context detection)
 * - MaskingEngine (Tokenization & local reversible vault)
 * - VisualRedactor (Canvas pixel obscuration & padding)
 * - ActionValidator (Inbound action security firewall)
 * - PrivacyVerifier (Pre-flight zero-leak & visual obscuration verifier)
 * 
 * Enforces:
 * - Hard Security Gate: Blocks outbound payload on ANY verification leak
 * - Multi-modal DOM + OCR bounding box preservation
 * - Blocked HTML tag enforcement (<script>, <iframe>, <style>, <meta>, <noscript>)
 * - Cryptographic standard SHA-256 signature over actual sanitized payload
 */

import {
  RedactionPolicy,
  DetectedEntity,
  M2OutboundSanitizedPayload,
  AgentActionProposal,
  M2ActionValidationResult,
  PrivacyAuditRecord
} from '../types/privacy';
import { PIIDetector } from './piiDetector';
import { MaskingEngine } from './maskingEngine';
import { VisualRedactor } from './visualRedactor';
import { ActionValidator } from './actionValidator';
import { PrivacyVerifier } from './privacyVerifier';
import { calculateSHA256 } from './cryptoUtils';

export const DEFAULT_REDACTION_POLICY: RedactionPolicy = {
  mode: 'CONSERVATIVE',
  confidenceThreshold: 0.80,
  paddingPixels: 6,
  redactionStyle: 'SOLID_DARK_LABEL',
  preserveTokenFormat: true,
  enabledCategories: {
    CREDIT_CARD: true,
    AADHAAR_NUMBER: true,
    PAN_NUMBER: true,
    EMAIL_ADDRESS: true,
    PHONE_NUMBER: true,
    PERSON_NAME: true,
    PASSWORD_SECRET: true,
    OTP: true,
    BANK_ACCOUNT: true,
    IFSC_CODE: true,
    STREET_ADDRESS: true,
    MEDICAL_DATA: true,
    CVV: true
  },
  blockedHtmlTags: ['script', 'style', 'noscript', 'meta', 'iframe']
};

/**
 * Strips blocked HTML tags (e.g., script, style, iframe, meta, noscript)
 * along with their content from raw DOM HTML before serialization.
 */
export function stripBlockedHtmlTags(html: string, blockedTags: string[]): string {
  if (!html || !blockedTags || blockedTags.length === 0) return html;

  let sanitized = html;
  for (const tag of blockedTags) {
    const cleanTag = tag.trim().toLowerCase();
    if (!cleanTag) continue;

    // Remove paired tag with content: <tag ...>...</tag>
    const pairedRegex = new RegExp(`<${cleanTag}\\b[^<]*(?:(?!<\\/${cleanTag}>)<[^<]*)*<\\/${cleanTag}>`, 'gi');
    sanitized = sanitized.replace(pairedRegex, '');

    // Remove self-closing or lone tags: <tag ... /> or <tag ...>
    const singleRegex = new RegExp(`<${cleanTag}\\b[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(singleRegex, '');
  }

  return sanitized;
}

/**
 * Parses DOM elements and their attributes from raw HTML for DOM-level PII detection.
 */
export function parseDomElementsFromHtml(html: string): Array<{
  tag: string;
  attributes: Record<string, string>;
  selector: string;
}> {
  if (!html) return [];
  const elements: Array<{ tag: string; attributes: Record<string, string>; selector: string }> = [];
  const tagRegex = /<([a-zA-Z0-9_-]+)((?:\s+[a-zA-Z0-9_-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(html)) !== null) {
    const tag = tagMatch[1].toLowerCase();
    const attrString = tagMatch[2];
    const attributes: Record<string, string> = {};
    const attrRegex = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const key = attrMatch[1].toLowerCase();
      const val = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
      attributes[key] = val;
    }

    elements.push({
      tag,
      attributes,
      selector: attributes.id ? ('#' + attributes.id) : tag
    });
  }

  return elements;
}

export class PrivacyGuardCoordinator {
  public detector: PIIDetector;
  public maskingEngine: MaskingEngine;
  public visualRedactor: VisualRedactor;
  public actionValidator: ActionValidator;
  public privacyVerifier: PrivacyVerifier;
  public policy: RedactionPolicy;

  constructor(initialPolicy: RedactionPolicy = DEFAULT_REDACTION_POLICY) {
    this.policy = { ...initialPolicy };
    this.detector = new PIIDetector(this.policy);
    this.maskingEngine = new MaskingEngine();
    this.visualRedactor = new VisualRedactor(this.policy);
    this.actionValidator = new ActionValidator(this.maskingEngine);
    this.privacyVerifier = new PrivacyVerifier(this.detector);
  }

  public updatePolicy(updated: Partial<RedactionPolicy>): void {
    this.policy = { ...this.policy, ...updated };
    this.detector.updatePolicy(this.policy);
    this.visualRedactor.updatePolicy(this.policy);
  }

  /**
   * Main Pipeline Step: Ingest Raw DOM & Visuals, output Sanitized Outbound Payload
   * If verification fails, outboundPayload is strictly null (HARD SECURITY GATE).
   */
  public processPageContext(
    sessionId: string,
    pageMetadata: { domain: string; title: string; viewport: { width: number; height: number } },
    rawDomHtml: string,
    canvas: HTMLCanvasElement | null,
    ocrDetections: Array<{ text: string; bbox: any; confidence: number }>,
    interactableElements: Array<{
      id: string;
      selector: string;
      type: string;
      label?: string;
      value?: string;
      options?: string[];
      disabled?: boolean;
      required?: boolean;
    }> = [],
    visualPerception?: any
  ): {
    outboundPayload: M2OutboundSanitizedPayload | null;
    detections: DetectedEntity[];
    auditRecord: PrivacyAuditRecord;
    verificationPassed: boolean;
    verificationLeaks: string[];
  } {
    const startTime = Date.now();
    const allDetections: DetectedEntity[] = [];

    // Step 1: Detect PII in Raw DOM HTML text
    const domDetections = this.detector.detectInText(rawDomHtml, 'DOM_TEXT');
    allDetections.push(...domDetections);

    // Step 1b: Detect PII in DOM Element Attributes (e.g. input[type="password"], autocomplete="one-time-code")
    const domElements = parseDomElementsFromHtml(rawDomHtml);
    for (const el of domElements) {
      const elDetections = this.detector.detectInDOMElement(el);
      allDetections.push(...elDetections);
    }

    // Step 2: Correlate with M4 OCR detections
    const ocrCorrelated = this.detector.correlateOCRBoxes(ocrDetections);
    allDetections.push(...ocrCorrelated);

    // Step 3: Multi-Modal Entity Merging (DOM + OCR)
    // When DOM entity (without bbox) and OCR entity (with bbox) match the same PII:
    // - Retain the spatial bounding box from OCR
    // - Retain the highest confidence score
    // - Record multi-modal correlation
    const mergedMap = new Map<string, DetectedEntity>();

    for (const item of allDetections) {
      // Normalize raw text (ignore whitespace, dashes, case)
      const normalizedText = item.rawText.trim().toLowerCase().replace(/[\s-]/g, '');
      const key = `${item.category}_${normalizedText}`;

      if (!mergedMap.has(key)) {
        mergedMap.set(key, { ...item });
      } else {
        const existing = mergedMap.get(key)!;
        // Merge bounding box if existing lacked one
        if (!existing.bbox && item.bbox) {
          existing.bbox = item.bbox;
        }
        // Preserve maximum confidence
        existing.confidence = Math.max(existing.confidence, item.confidence);
        // Preserve DOM selector if available
        if (!existing.domSelector && item.domSelector) {
          existing.domSelector = item.domSelector;
        }
        // If sources differ, mark multi-modal correlation
        if (existing.source !== item.source) {
          existing.source = 'OCR_VISION'; // ensures spatial redactor has visual priority
          existing.ruleMatched = `${existing.ruleMatched || existing.category} (DOM+OCR merged)`;
        }
      }
    }

    const deduplicatedDetections = Array.from(mergedMap.values());

    // Step 4: Enforce blocked HTML tags (<script>, <iframe>, <style>, <meta>, <noscript>)
    const sanitizedHtmlBase = stripBlockedHtmlTags(rawDomHtml, this.policy.blockedHtmlTags);

    // Step 5: Mask DOM string with deterministic tokens
    const { maskedText } = this.maskingEngine.maskString(sanitizedHtmlBase, deduplicatedDetections);

    // Step 6: Perform Visual Redaction on Canvas (if provided)
    let redactedScreenshotBase64 = '';
    if (canvas) {
      this.visualRedactor.redactCanvas(canvas, deduplicatedDetections);
      try {
        redactedScreenshotBase64 = canvas.toDataURL('image/png');
      } catch (e) {
        redactedScreenshotBase64 = '';
      }
    }

    // Step 7: Create sanitized title
    const { maskedText: sanitizedTitle } = this.maskingEngine.maskString(pageMetadata.title, deduplicatedDetections);

    // Step 8: Build detected token hints (without leaking raw values)
    const detectedTokenList = deduplicatedDetections.map(d => ({
      token: d.token,
      category: d.category,
      purposeHint: `Detected via ${d.source} (${d.ruleMatched || d.category})`
    }));

    // Step 8.5: Build sanitizedElements
    const sanitizedElements = interactableElements.map(el => {
      // Mask label and value if they contain PII
      const maskedLabel = el.label ? this.maskingEngine.maskString(el.label, deduplicatedDetections).maskedText : undefined;
      const maskedValue = el.value ? this.maskingEngine.maskString(el.value, deduplicatedDetections).maskedText : undefined;
      return {
        id: el.id,
        type: el.type,
        label: maskedLabel,
        value: maskedValue,
        options: el.options,
        selector: el.selector,
        disabled: el.disabled,
        required: el.required
      };
    });

    // Step 9: Canonical String Representation for Genuine SHA-256 Signature
    const canonicalPayloadString = JSON.stringify({
      sessionId,
      domain: pageMetadata.domain,
      sanitizedTitle,
      viewport: pageMetadata.viewport,
      sanitizedDomSkeleton: maskedText,
      sanitizedElementsCount: sanitizedElements.length,
      screenshotLength: redactedScreenshotBase64.length,
      tokens: detectedTokenList.map(t => t.token),
      policyVersion: `v1.0-${this.policy.mode}`
    });

    const realSha256 = calculateSHA256(canonicalPayloadString);

    // Step 10: Build candidate outbound payload
    const candidatePayload: M2OutboundSanitizedPayload = {
      sessionId,
      timestamp: Date.now(),
      pageMetadata: {
        domain: pageMetadata.domain,
        sanitizedTitle,
        viewport: pageMetadata.viewport
      },
      sanitizedDomSkeleton: maskedText,
      sanitizedElements,
      redactedScreenshotBase64,
      detectedTokenList,
      policyVersion: `v1.0-${this.policy.mode}`,
      verificationSignature: `SHA256:${realSha256}`,
      ...(visualPerception && {
        visualPerception: {
          model: visualPerception.model,
          runtime: visualPerception.runtime,
          inferenceMs: visualPerception.inferenceMs,
          predictions: Array.isArray(visualPerception.predictions) ?
            visualPerception.predictions.map((p: any) => ({ label: p.label, score: p.score })) : []
        }
      })
    };

    // Step 11: Pre-Flight Verification Pass (with Canvas & Bounding Box Inspection)
    const { passed, leaksDetected, auditRecord } = this.privacyVerifier.verifyOutboundPayload(
      candidatePayload,
      deduplicatedDetections,
      startTime,
      canvas
    );

    // Step 12: HARD SECURITY GATE
    // If verification failed for ANY reason, outboundPayload is blocked (null)
    return {
      outboundPayload: passed ? candidatePayload : null,
      detections: deduplicatedDetections,
      auditRecord,
      verificationPassed: passed,
      verificationLeaks: leaksDetected
    };
  }

  /**
   * Inbound Action Security Check (M1 -> M2 -> M3)
   */
  public validateInboundAction(action: AgentActionProposal): M2ActionValidationResult {
    return this.actionValidator.validateAction(action);
  }
}
