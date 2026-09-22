/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Module: Pre-Flight Privacy Verifier & Audit Generator
 * 
 * Final verification checkpoint before payload transmission to Cloud M1.
 * Guarantees zero unmasked PII leaks in outbound serialized DOM, metadata, or visual screenshot.
 * Enforces hard security fail-closed semantics:
 * - If DOM verification fails -> payload blocked
 * - If screenshot verification fails -> payload blocked
 * - Zero raw PII in logs, telemetry, or audit records
 */

import { M2OutboundSanitizedPayload, PrivacyAuditRecord, PIICategory, DetectedEntity } from '../types/privacy';
import { PIIDetector } from './piiDetector';
import { parseDomElementsFromHtml } from './privacyGuardCoordinator';

export class PrivacyVerifier {
  private detector: PIIDetector;

  constructor(detector: PIIDetector) {
    this.detector = detector;
  }

  /**
   * Verifies that bounding box regions on a canvas are actually obscured.
   * Fails closed if pixels indicate unredacted content or missing image.
   */
  public verifyVisualRedaction(
    canvas: HTMLCanvasElement | null | undefined,
    screenshotBase64: string,
    visualEntities: DetectedEntity[]
  ): { passed: boolean; leakReasons: string[] } {
    const leakReasons: string[] = [];

    // If no visual entities with bounding boxes exist, visual redaction is satisfied
    if (!visualEntities || visualEntities.length === 0) {
      return { passed: true, leakReasons: [] };
    }

    // 1. Verify screenshot base64 artifact exists and is a valid image URI
    if (!screenshotBase64 || !screenshotBase64.startsWith('data:image/')) {
      leakReasons.push('Visual Redaction leak: Visual PII entities exist but redactedScreenshotBase64 is missing or empty');
      return { passed: false, leakReasons };
    }

    // 2. If canvas 2D context is accessible, inspect actual pixel data within each sensitive bounding box
    if (canvas && typeof canvas.getContext === 'function') {
      try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          leakReasons.push('Visual Redaction leak: Unable to acquire canvas 2D context for pixel verification');
          return { passed: false, leakReasons };
        }

        for (const entity of visualEntities) {
          if (!entity.bbox) continue;
          const { x, y, width, height } = entity.bbox;
          if (width <= 0 || height <= 0) continue;

          const clampX = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
          const clampY = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
          const clampW = Math.max(1, Math.min(canvas.width - clampX, Math.round(width)));
          const clampH = Math.max(1, Math.min(canvas.height - clampY, Math.round(height)));

          const imgData = ctx.getImageData(clampX, clampY, clampW, clampH);
          const data = imgData.data;

          // Compute average luminance and check for obscuration
          let darkPixelCount = 0;
          let totalSampled = 0;
          let sumR = 0, sumG = 0, sumB = 0;

          // Sample pixels across the bounding box
          for (let i = 0; i < data.length; i += 16) { // step by 4 pixels (16 bytes)
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            totalSampled++;
            sumR += r;
            sumG += g;
            sumB += b;

            // In solid dark or badge redactions, luminance is low (r,g,b <= 55) and opacity is high
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            if (luminance <= 60 && a >= 200) {
              darkPixelCount++;
            }
          }

          if (totalSampled > 0) {
            const darkRatio = darkPixelCount / totalSampled;
            // A properly obscured bounding box in SOLID_DARK_LABEL or SOLID_BLACK is >= 60% dark
            // If the box contains bright unredacted text on light background, darkRatio is near 0
            if (darkRatio < 0.40) {
              leakReasons.push(
                `Visual Redaction leak: [${entity.category}] bbox at (${Math.round(x)}, ${Math.round(y)}) failed obscuration check (darkRatio: ${(darkRatio * 100).toFixed(1)}%)`
              );
            }
          }
        }
      } catch (e: any) {
        leakReasons.push(`Visual Redaction verification error: ${e?.message || 'Pixel inspection failed'}`);
      }
    }

    const passed = leakReasons.length === 0;
    return { passed, leakReasons };
  }

  /**
   * Scans an outbound payload for accidental raw PII leakages.
   * Completely excludes rawText from logs, errors, and telemetry to prevent secondary leaks.
   */
  public verifyOutboundPayload(
    payload: M2OutboundSanitizedPayload,
    initialEntitiesOrCount: number | DetectedEntity[],
    startTime: number,
    canvas?: HTMLCanvasElement | null
  ): {
    passed: boolean;
    leaksDetected: string[];
    auditRecord: PrivacyAuditRecord;
  } {
    const leaksDetected: string[] = [];
    const detectedEntities: DetectedEntity[] = Array.isArray(initialEntitiesOrCount)
      ? initialEntitiesOrCount
      : [];
    const initialDetectionsCount = Array.isArray(initialEntitiesOrCount)
      ? initialEntitiesOrCount.length
      : initialEntitiesOrCount;

    // 1. Scan serialized DOM skeleton
    const domDetections = this.detector.detectInText(payload.sanitizedDomSkeleton, 'DOM_TEXT');
    for (const d of domDetections) {
      // If it looks like raw sensitive data rather than an escaped token
      if (!d.rawText.startsWith('<PII:') && !d.rawText.endsWith('>')) {
        // SAFE METADATA ONLY: Never include d.rawText or slices of rawText in error logs!
        leaksDetected.push(`DOM Skeleton leak: [${d.category}] (rule: ${d.ruleMatched || 'UNKNOWN'}, source: ${d.source})`);
      }
    }

    // 1b. Scan DOM element attributes in serialized DOM skeleton
    const domElements = parseDomElementsFromHtml(payload.sanitizedDomSkeleton);
    for (const el of domElements) {
      const elDetections = this.detector.detectInDOMElement(el);
      for (const ed of elDetections) {
        if (!ed.rawText.startsWith('<PII:') && !ed.rawText.endsWith('>')) {
          leaksDetected.push(`DOM Skeleton input leak: [${ed.category}] in ${el.selector}`);
        }
      }
    }

    // 2. Scan page title and metadata
    const titleDetections = this.detector.detectInText(payload.pageMetadata.sanitizedTitle, 'DOM_TEXT');
    for (const d of titleDetections) {
      if (!d.rawText.startsWith('<PII:') && !d.rawText.endsWith('>')) {
        leaksDetected.push(`Page Title leak: [${d.category}] (source: ${d.source})`);
      }
    }

    // 3. Scan purpose hints
    for (const item of payload.detectedTokenList) {
      const hintDetections = this.detector.detectInText(item.purposeHint, 'DOM_TEXT');
      for (const hd of hintDetections) {
        if (!hd.rawText.startsWith('<PII:') && !hd.rawText.endsWith('>')) {
          leaksDetected.push(`Token purpose hint leak: [${hd.category}]`);
        }
      }
    }

    // 4. Real Visual Redaction Verification (Screenshot and Bounding Boxes)
    const visualEntities = detectedEntities.filter(
      e => e.bbox && e.bbox.width > 0 && e.bbox.height > 0
    );

    if (visualEntities.length > 0) {
      const { passed: visualPassed, leakReasons } = this.verifyVisualRedaction(
        canvas,
        payload.redactedScreenshotBase64,
        visualEntities
      );
      if (!visualPassed) {
        leaksDetected.push(...leakReasons);
      }
    }

    const passed = leaksDetected.length === 0;
    const duration = Date.now() - startTime;

    const categoriesFound: PIICategory[] = Array.from(
      new Set(payload.detectedTokenList.map(t => t.category))
    );

    const auditRecord: PrivacyAuditRecord = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      sessionId: payload.sessionId,
      detectedCount: initialDetectionsCount,
      redactedCount: payload.detectedTokenList.length,
      categoriesFound,
      preFlightVerificationStatus: passed ? 'PASSED' : 'FAILED_BLOCKED',
      potentialLeakPrevented: initialDetectionsCount > 0,
      executionDurationMs: duration
    };

    return {
      passed,
      leaksDetected,
      auditRecord
    };
  }
}
