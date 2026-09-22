/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Detector: Bank Account Numbers & Indian IFSC Codes
 * 
 * Rules:
 * - Bank Account: 9 to 18 digits with contextual keywords (e.g. "Account Number", "A/C No", "Beneficiary Account", "Bank A/C")
 *   or DOM attributes (e.g. name="account_number", id="acc-num"). Rejects isolated random numbers.
 * - IFSC Code: 11 characters (4 letters, 0, 6 alphanumeric characters).
 * - Distinct categories: BANK_ACCOUNT vs IFSC_CODE.
 */

// Indian IFSC Code: 4 uppercase letters, 0, 6 uppercase letters/digits
export const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;

// Bank Account with explicit preceding label/context (9 to 18 digits)
export const BANK_ACCOUNT_WITH_LABEL_REGEX = /(?:(?:Beneficiary\s+Account(?:\s+Number)?|Account\s+Number|Bank\s+Account(?:\s+No\.?)?|A\/c\s+No\.?|Acct\s+No\.?|Account\s+No\.?|A\/C)\s*[:#-]?\s*)(\d{9,18})\b/gi;

// Context keywords for bank account verification
const BANK_ACCOUNT_KEYWORDS = /\b(account|beneficiary|a\/c|acct|bank|savings|current)\b/i;

/**
 * Validates IFSC format
 */
export function isValidIFSC(ifsc: string): boolean {
  const cleaned = ifsc.trim().toUpperCase();
  if (cleaned.length !== 11) return false;
  // Format: 4 letters, 5th character is '0', 6 alphanumeric characters
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned);
}

/**
 * Validates a bank account candidate.
 * Requires 9 to 18 digits and checks that it's not a generic repetitive sequence.
 */
export function isValidBankAccount(digits: string, context?: string): boolean {
  const cleaned = digits.replace(/\D/g, '');
  if (cleaned.length < 9 || cleaned.length > 18) return false;

  // Reject all identical digits (e.g., 0000000000)
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // If context is provided, ensure bank/account related keywords exist
  if (context && !BANK_ACCOUNT_KEYWORDS.test(context)) {
    return false;
  }

  return true;
}

/**
 * Checks DOM element attributes for bank account indicators
 */
export function isDOMElementBankAccount(attributes: Record<string, string>): boolean {
  if (!attributes) return false;

  const combined = [
    attributes.name || '',
    attributes.id || '',
    attributes.placeholder || '',
    attributes['aria-label'] || '',
    attributes.autocomplete || ''
  ].join(' ').toLowerCase();

  return /(?:account[-_]?number|acct[-_]?num|bank[-_]?acc|beneficiary[-_]?acc)/i.test(combined);
}

/**
 * Checks DOM element attributes for IFSC indicators
 */
export function isDOMElementIFSC(attributes: Record<string, string>): boolean {
  if (!attributes) return false;

  const combined = [
    attributes.name || '',
    attributes.id || '',
    attributes.placeholder || '',
    attributes['aria-label'] || ''
  ].join(' ').toLowerCase();

  return /\bifsc\b/i.test(combined);
}

/**
 * Extracts valid IFSC codes with position indices from text
 */
export function detectIFSC(text: string): Array<{ ifsc: string; index: number }> {
  const matches: Array<{ ifsc: string; index: number }> = [];
  const regex = new RegExp(IFSC_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (isValidIFSC(match[0])) {
      matches.push({ ifsc: match[0], index: match.index });
    }
  }
  return matches;
}

/**
 * Extracts bank account numbers with position indices from text
 */
export function detectBankAccount(text: string): Array<{ accountNumber: string; index: number }> {
  const matches: Array<{ accountNumber: string; index: number }> = [];
  const regex = new RegExp(BANK_ACCOUNT_WITH_LABEL_REGEX.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const acc = match[1];
    if (acc && isValidBankAccount(acc)) {
      matches.push({ accountNumber: acc, index: match.index });
    }
  }
  return matches;
}

