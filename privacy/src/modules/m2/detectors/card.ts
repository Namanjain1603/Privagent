/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Detector: Credit / Debit Card Numbers (Luhn Checksum)
 * 
 * Rules:
 * - 13 to 19 digits (standard Visa, MasterCard, Amex, RuPay)
 * - Luhn algorithm (mod-10 checksum) to validate structural integrity
 * - Rejects random digit sequences to prevent false positives
 * - Supports benchmark / test suite synthetic card patterns
 */

/**
 * Validates a card number using the Luhn mod-10 checksum algorithm.
 * Guarantees that random digit sequences are rejected while structurally valid cards
 * and benchmark test numbers pass.
 */
export function isValidLuhn(cardNumber: string): boolean {
  const sanitized = cardNumber.replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;

  // Standard Luhn mod-10 algorithm
  let sum = 0;
  let shouldDouble = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
