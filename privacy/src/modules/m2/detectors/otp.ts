/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Detector: One-Time Password (OTP) & Verification Codes
 * 
 * Rules:
 * - Context-aware detection of 4 to 8 digit OTPs / verification codes
 * - Strict context checking: requires proximity to OTP keywords (OTP, One Time Password, Verification Code, Security Code, etc.)
 * - Inspects DOM attributes: autocomplete="one-time-code", name, id, placeholder, aria-label
 * - Rejects standalone random numbers (order IDs, zip codes, prices) to avoid false positives
 * - OTP values are classified as high-risk and MUST remain strictly local
 */

export const OTP_TEXT_REGEX = /(?:(?:\bone[- ]?time[- ]?(?:password|passcode)\b|\bverification\s+code\b|\bsecurity\s+code\b|\blogin\s+code\b|\bauth\s+code\b|\botp\b)\s*(?:is\s+|code\s+|[:#=-]\s*)*)(\d{4,8})\b/gi;

export const OTP_STANDALONE_CONTEXT_REGEX = /\b(otp|one[- ]?time[- ]?(?:password|passcode)|verification[- ]?code|security[- ]?code)\b/i;

/**
 * Validates whether a matched candidate is a true OTP within context.
 * Rejects common false positives like years (19xx, 20xx without OTP label) or currency.
 */
export function isValidOTPText(candidate: string, context?: string): boolean {
  const digits = candidate.replace(/\D/g, '');
  if (digits.length < 4 || digits.length > 8) return false;

  // If context is provided, check for OTP keywords
  if (context) {
    return OTP_STANDALONE_CONTEXT_REGEX.test(context);
  }

  return true;
}

/**
 * Checks DOM element attributes for OTP markers (e.g. autocomplete="one-time-code")
 */
export function isDOMElementOTP(attributes: Record<string, string>): boolean {
  if (!attributes) return false;

  const autocomplete = (attributes.autocomplete || '').toLowerCase();
  if (autocomplete === 'one-time-code') return true;

  const combined = [
    attributes.name || '',
    attributes.id || '',
    attributes.placeholder || '',
    attributes['aria-label'] || ''
  ].join(' ').toLowerCase();

  return /\b(otp|one[-_]?time[-_]?password|verification[-_]?code|sms[-_]?code|auth[-_]?code)\b/i.test(combined);
}

/**
 * Extracts OTP codes with their position indices from text
 */
export function detectOTP(text: string): Array<{ code: string; index: number }> {
  const matches: Array<{ code: string; index: number }> = [];
  const regex = new RegExp(OTP_TEXT_REGEX.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const code = match[1];
    if (code && isValidOTPText(code)) {
      matches.push({ code, index: match.index });
    }
  }
  return matches;
}

