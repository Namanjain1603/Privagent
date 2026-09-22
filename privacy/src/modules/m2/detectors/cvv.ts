/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Detector: Card Verification Value (CVV / CVC)
 * 
 * Rules:
 * - 3 or 4 digits following CVV, CVC, CVV2, CVC2, CID, Security Code labels
 * - Category: CVV
 * - Fully redacted
 */

export const CVV_REGEX = /(?:(?:CVV2?|CVC2?|CID|Security\s+Code|Card\s+Verification\s+Value)\s*[:=]\s*)(\d{3,4})\b/gi;

export function isValidCVV(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length === 3 || digits.length === 4;
}
