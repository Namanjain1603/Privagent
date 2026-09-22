/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Detector: Indian & Mobile Phone Numbers
 * 
 * Rules:
 * - Indian mobile numbers are exactly 10 digits starting with 6, 7, 8, or 9
 * - Optionally prefixed with country code (+91, +91-, +91 ) or trunk prefix (0)
 * - May be formatted as 10 digits, or 5-5 grouped digits
 * - Strictly rejects 8-digit partial sequences (e.g. "1234 5678") or numbers starting with 1-5
 */

/**
 * Validates whether a candidate string is an Indian mobile phone number.
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');

  // 12 digits starting with country code 91: next digit must be 6-9
  if (digits.length === 12 && digits.startsWith('91')) {
    return /^[6-9]/.test(digits.slice(2));
  }

  // 11 digits starting with trunk 0: next digit must be 6-9
  if (digits.length === 11 && digits.startsWith('0')) {
    return /^[6-9]/.test(digits.slice(1));
  }

  // Exactly 10 digits: must start with 6-9 (Indian mobile)
  if (digits.length === 10) {
    return /^[6-9]/.test(digits);
  }

  // Standard North American 10-digit if explicitly prefixed with +1
  if (digits.length === 11 && digits.startsWith('1')) {
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits.slice(1));
  }

  return false;
}

/**
 * High-precision regex matching phone numbers without false-positive overlap on Aadhaar or card fragments:
 * - Standard 10-digit Indian mobile: \b[6-9]\d{9}\b
 * - Grouped Indian mobile: \b[6-9]\d{4}[\s-]\d{5}\b
 * - +91 prefixed Indian mobile: \b\+91[\s-]?[6-9]\d{9}\b | \b\+91[\s-]?[6-9]\d{4}[\s-]\d{5}\b
 * - 0 prefixed Indian mobile: \b0[6-9]\d{9}\b
 * - North American +1 format: \b\+1[\s-]?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s-]?[2-9]\d{2}[\s-]?\d{4}\b
 */
export const PHONE_REGEX = /\b(?:\+91[\s-]?)?[6-9]\d{9}\b|\b(?:\+91[\s-]?)?[6-9]\d{4}[\s-]\d{5}\b|\b0[6-9]\d{9}\b|\b\+1[\s-]?(?:\([2-9]\d{2}\)|[2-9]\d{2})[\s-]?[2-9]\d{2}[\s-]?\d{4}\b/g;
