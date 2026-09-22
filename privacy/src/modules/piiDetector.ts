/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Module: PII & Sensitive Data Detection Engine
 * 
 * Multi-modal detection combining:
 * 1. Algorithmic validators (Luhn check, Aadhaar syntax, PAN syntax)
 * 2. Regular expression rules with confidence scoring
 * 3. DOM-context heuristics (input attributes, autocomplete, labels)
 * 4. OCR text and bounding-box spatial awareness from M4
 */

import { PIICategory, DetectedEntity, BoundingBox, RedactionPolicy } from '../types/privacy';
import { isValidAadhaarFormat, validateVerhoeff, AADHAAR_REGEX } from './m2/detectors/aadhaar';
import { isValidPhoneNumber, PHONE_REGEX } from './m2/detectors/phone';
import { isValidLuhn, CREDIT_CARD_REGEX } from './m2/detectors/card';
import { isValidPasswordText, PASSWORD_TEXT_REGEX } from './m2/detectors/password';
import { isValidCVV, CVV_REGEX } from './m2/detectors/cvv';
import { isValidOTPText, isDOMElementOTP, OTP_TEXT_REGEX } from './m2/detectors/otp';
import { 
  isValidBankAccount, 
  isValidIFSC, 
  isDOMElementBankAccount, 
  isDOMElementIFSC, 
  IFSC_REGEX, 
  BANK_ACCOUNT_WITH_LABEL_REGEX 
} from './m2/detectors/bank';

// Re-export detector utilities for modules and verification suite
export { isValidAadhaarFormat, validateVerhoeff, AADHAAR_REGEX };
export { isValidPhoneNumber, PHONE_REGEX };
export { isValidLuhn, CREDIT_CARD_REGEX };
export { isValidPasswordText, PASSWORD_TEXT_REGEX };
export { isValidCVV, CVV_REGEX };
export { isValidOTPText, isDOMElementOTP, OTP_TEXT_REGEX };
export { isValidBankAccount, isValidIFSC, isDOMElementBankAccount, isDOMElementIFSC, IFSC_REGEX, BANK_ACCOUNT_WITH_LABEL_REGEX };

/**
 * Indian PAN Card validation (Format: 5 letters, 4 digits, 1 letter)
 * 4th character represents entity type (e.g., P = Person, C = Company)
 */
export function isValidPAN(pan: string): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  return panRegex.test(pan.toUpperCase().trim());
}

export function isValidIndianPhone(phone: string): boolean {
  return isValidPhoneNumber(phone);
}

export function isValidEmail(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim());
}

interface PatternRule {
  category: PIICategory;
  name: string;
  regex: RegExp;
  confidence: number;
  priority: number;
  validator?: (match: string) => boolean;
}

const REGEX_RULES: PatternRule[] = [
  // Credit / Debit Cards (with Luhn validator)
  {
    category: 'CREDIT_CARD',
    name: 'Credit Card Number',
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    confidence: 0.95,
    priority: 9,
    validator: (m) => isValidLuhn(m)
  },
  // Indian Aadhaar Number (12 digits in format "XXXX XXXX XXXX", "XXXX-XXXX-XXXX", or 12-digit UID)
  {
    category: 'AADHAAR_NUMBER',
    name: 'Aadhaar ID',
    regex: AADHAAR_REGEX,
    confidence: 0.96,
    priority: 8,
    validator: (m) => isValidAadhaarFormat(m)
  },
  // Indian PAN Card
  {
    category: 'PAN_NUMBER',
    name: 'PAN Card',
    regex: /\b[A-Za-z]{5}\d{4}[A-Za-z]\b/g,
    confidence: 0.96,
    priority: 7,
    validator: (m) => isValidPAN(m)
  },
  // Email Address
  {
    category: 'EMAIL_ADDRESS',
    name: 'Email Address',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    confidence: 0.99,
    priority: 5
  },
  // Indian & International Phone Numbers (high-precision 10-digit mobile, rejects Aadhaar substrings)
  {
    category: 'PHONE_NUMBER',
    name: 'Phone Number',
    regex: PHONE_REGEX,
    confidence: 0.92,
    priority: 4,
    validator: (m) => isValidPhoneNumber(m)
  },
  // Card Security Code (CVV / CVC)
  {
    category: 'CVV',
    name: 'Card Security Code (CVV)',
    regex: CVV_REGEX,
    confidence: 0.99,
    priority: 9,
    validator: (m) => isValidCVV(m)
  },
  // Passwords, Secrets, API Keys, Tokens
  {
    category: 'PASSWORD_SECRET',
    name: 'API Key / Secret Token',
    regex: /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|Bearer\s+[a-zA-Z0-9._~+/-]{16,}|AIza[0-9A-Za-z-_]{35})\b/g,
    confidence: 0.99,
    priority: 10
  },
  // Plain-text Passwords (e.g. "Password: MySecure@Pass123", "Pass: ...")
  {
    category: 'PASSWORD_SECRET',
    name: 'Password Credential',
    regex: PASSWORD_TEXT_REGEX,
    confidence: 0.98,
    priority: 8,
    validator: (m) => isValidPasswordText(m)
  },
  // One-Time Password (OTP) & Verification Codes (context-aware: requires OTP/verification keywords)
  {
    category: 'OTP',
    name: 'One-Time Password (OTP)',
    regex: OTP_TEXT_REGEX,
    confidence: 0.98,
    priority: 9,
    validator: (m) => isValidOTPText(m)
  },
  // Indian IFSC Code (11-character bank branch routing code)
  {
    category: 'IFSC_CODE',
    name: 'IFSC Code',
    regex: IFSC_REGEX,
    confidence: 0.97,
    priority: 6,
    validator: (m) => isValidIFSC(m)
  },
  // Bank Account Number (9 to 18 digits with preceding account context)
  {
    category: 'BANK_ACCOUNT',
    name: 'Bank Account Number',
    regex: BANK_ACCOUNT_WITH_LABEL_REGEX,
    confidence: 0.95,
    priority: 7,
    validator: (m) => isValidBankAccount(m)
  },
  // Person Full Name when accompanied by explicit labels (e.g. "Naam: Rahul Sharma", "Applicant Name: Rahul Sharma")
  // Only matches horizontal space on the same line, capped at 2-3 capitalized name words
  {
    category: 'PERSON_NAME',
    name: 'Person Full Name',
    regex: /(?:(?:Applicant\s+Name|Cardholder\s+Name|Customer\s+Name|Patient\s+Name|User\s+Name|Full\s+Name|Naam|Name|Cardholder|Customer|Patient|User)\s*[:=]\s*)([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+){1,2})/g,
    confidence: 0.88,
    priority: 3
  }
];

// Field label keywords to prevent greedy name capture on multi-field text
const FIELD_LABEL_WORDS = new Set([
  'aadhaar', 'pan', 'card', 'number', 'mobile', 'phone', 'email', 
  'password', 'passwd', 'pass', 'cvv', 'cvc', 'expiry', 'date', 
  'address', 'pincode', 'zip', 'total', 'items', 'order', 'id', 
  'amount', 'balance', 'account', 'ifsc', 'contact', 'alternate', 
  'customer', 'applicant', 'member'
]);

// Sensitive DOM attribute triggers
const SENSITIVE_ATTR_KEYWORDS = [
  'password', 'passwd', 'pwd',
  'card', 'cc-number', 'cvv', 'cvc', 'exp-date',
  'aadhaar', 'uidai', 'pan', 'ssn', 'tax-id',
  'token', 'secret', 'api-key', 'auth',
  'otp', 'one-time-code', 'verification-code',
  'account-number', 'account_number', 'bank', 'ifsc'
];

interface MatchedSpan {
  start: number;
  end: number;
  rawText: string;
  category: PIICategory;
  confidence: number;
  ruleName: string;
  priority: number;
}

export class PIIDetector {
  private policy: RedactionPolicy;

  constructor(policy: RedactionPolicy) {
    this.policy = policy;
  }

  public updatePolicy(newPolicy: RedactionPolicy): void {
    this.policy = newPolicy;
  }

  /**
   * Detects PII across a raw string of text (e.g. from DOM or OCR text stream)
   * Prevents false-positive substring overlap (e.g. phone numbers matching inside Aadhaar).
   */
  public detectInText(
    text: string, 
    source: DetectedEntity['source'] = 'REGEX_RULE',
    domSelector?: string,
    bbox?: BoundingBox
  ): DetectedEntity[] {
    const confirmedSpans: MatchedSpan[] = [];

    // Sort rules by priority descending so higher-specificity rules evaluate first
    const sortedRules = [...REGEX_RULES].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!this.policy.enabledCategories[rule.category]) continue;

      rule.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.regex.exec(text)) !== null) {
        let rawText = match[0].trim();
        let matchStart = match.index;
        let matchEnd = match.index + match[0].length;

        // If rule has capture group (e.g. PERSON_NAME after "Naam:", CVV after "CVV:", Password after "Password:"), extract the actual entity
        if (match[1]) {
          rawText = match[1].trim();
          matchStart = match.index + match[0].indexOf(rawText);
          matchEnd = matchStart + rawText.length;
        }

        // Post-process PERSON_NAME to avoid greedily capturing trailing field labels
        if (rule.category === 'PERSON_NAME') {
          const parts = rawText.split(/[ \t]+/);
          const cleanParts: string[] = [];
          for (const p of parts) {
            const normalized = p.replace(/[:;,.]/g, '').toLowerCase();
            if (FIELD_LABEL_WORDS.has(normalized)) break;
            cleanParts.push(p);
          }
          if (cleanParts.length === 0) continue;
          rawText = cleanParts.slice(0, 3).join(' ');
          matchStart = match.index + match[0].indexOf(rawText);
          matchEnd = matchStart + rawText.length;
        }

        // If an algorithmic validator exists, check it
        if (rule.validator && !rule.validator(rawText)) {
          continue;
        }

        // Apply confidence threshold from policy
        if (rule.confidence < this.policy.confidenceThreshold) {
          continue;
        }

        // --- SUBSTRING AND OVERLAP COLLISION RESOLUTION ---
        // 1. Check if candidate is a substring of an already confirmed detection (e.g. phone digits inside Aadhaar)
        const isSubstring = confirmedSpans.some(
          span => matchStart >= span.start && matchEnd <= span.end
        );
        if (isSubstring) {
          continue; // Skip substring match
        }

        // 2. Check if an existing confirmed span is a substring of this new longer detection
        const existingSubstringIdx = confirmedSpans.findIndex(
          span => span.start >= matchStart && span.end <= matchEnd
        );
        if (existingSubstringIdx !== -1) {
          // Replace the smaller detection with the longer confirmed detection
          confirmedSpans.splice(existingSubstringIdx, 1);
        }

        // 3. Check for any partial overlap
        const overlappingIdx = confirmedSpans.findIndex(
          span => Math.max(matchStart, span.start) < Math.min(matchEnd, span.end)
        );
        if (overlappingIdx !== -1) {
          const existing = confirmedSpans[overlappingIdx];
          if (rule.priority > existing.priority) {
            confirmedSpans.splice(overlappingIdx, 1);
          } else {
            continue; // Skip lower-priority overlapping candidate
          }
        }

        let ruleMatched = rule.name;
        let confidence = rule.confidence;
        if (rule.category === 'AADHAAR_NUMBER') {
          const cleaned = rawText.replace(/[\s-]/g, '');
          if (validateVerhoeff(cleaned)) {
            ruleMatched = 'Aadhaar ID (Verhoeff Checksum Verified)';
            confidence = 0.99;
          } else {
            ruleMatched = 'Aadhaar ID (12-Digit Format UID)';
            confidence = 0.95;
          }
        }

        confirmedSpans.push({
          start: matchStart,
          end: matchEnd,
          rawText,
          category: rule.category,
          confidence,
          ruleName: ruleMatched,
          priority: rule.priority
        });
      }
    }

    // Sort detected spans by start index in original text
    confirmedSpans.sort((a, b) => a.start - b.start);

    // Generate deterministic tokens sequentially
    const tokenCounts: Partial<Record<PIICategory, number>> = {};
    const results: DetectedEntity[] = confirmedSpans.map((span) => {
      const count = (tokenCounts[span.category] || 0) + 1;
      tokenCounts[span.category] = count;
      const token = `<PII:${span.category}_${count}>`;

      return {
        id: `det_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        category: span.category,
        rawText: span.rawText,
        token,
        confidence: span.confidence,
        source,
        domSelector,
        bbox,
        ruleMatched: span.ruleName,
        isVerified: true
      };
    });

    return results;
  }

  /**
   * Analyzes a DOM Node and its attributes for sensitive fields
   */
  public detectInDOMElement(element: {
    tag: string;
    attributes: Record<string, string>;
    text?: string;
    selector: string;
    bbox?: BoundingBox;
  }): DetectedEntity[] {
    const results: DetectedEntity[] = [];

    // Check DOM input types directly
    const inputType = (element.attributes['type'] || '').toLowerCase();
    if (inputType === 'password') {
      results.push({
        id: `dom_pwd_${Date.now()}`,
        category: 'PASSWORD_SECRET',
        rawText: element.attributes['value'] || '********',
        token: `<PII:PASSWORD_SECRET_1>`,
        confidence: 1.0,
        source: 'DOM_ATTRIBUTE',
        domSelector: element.selector,
        bbox: element.bbox,
        ruleMatched: 'input[type="password"]',
        isVerified: true
      });
      return results;
    }

    // Check OTP specific attributes
    if (isDOMElementOTP(element.attributes)) {
      results.push({
        id: `dom_otp_${Date.now()}`,
        category: 'OTP',
        rawText: element.attributes['value'] || 'OTP_VALUE',
        token: `<PII:OTP_1>`,
        confidence: 1.0,
        source: 'DOM_ATTRIBUTE',
        domSelector: element.selector,
        bbox: element.bbox,
        ruleMatched: 'DOM OTP input indicator (autocomplete="one-time-code" or name/id)',
        isVerified: true
      });
      return results;
    }

    // Check IFSC and Bank Account attributes directly
    if (isDOMElementIFSC(element.attributes)) {
      results.push({
        id: `dom_ifsc_${Date.now()}`,
        category: 'IFSC_CODE',
        rawText: element.attributes['value'] || 'IFSC_CODE',
        token: `<PII:IFSC_CODE_1>`,
        confidence: 0.98,
        source: 'DOM_ATTRIBUTE',
        domSelector: element.selector,
        bbox: element.bbox,
        ruleMatched: 'DOM IFSC code indicator',
        isVerified: true
      });
      return results;
    }

    if (isDOMElementBankAccount(element.attributes)) {
      results.push({
        id: `dom_bank_${Date.now()}`,
        category: 'BANK_ACCOUNT',
        rawText: element.attributes['value'] || 'ACCOUNT_NUMBER',
        token: `<PII:BANK_ACCOUNT_1>`,
        confidence: 0.98,
        source: 'DOM_ATTRIBUTE',
        domSelector: element.selector,
        bbox: element.bbox,
        ruleMatched: 'DOM Bank Account indicator',
        isVerified: true
      });
      return results;
    }

    // Check autocomplete, name, id, placeholder
    const combinedAttrs = [
      element.attributes['autocomplete'] || '',
      element.attributes['name'] || '',
      element.attributes['id'] || '',
      element.attributes['placeholder'] || '',
      element.attributes['aria-label'] || ''
    ].join(' ').toLowerCase();

    for (const keyword of SENSITIVE_ATTR_KEYWORDS) {
      if (combinedAttrs.includes(keyword)) {
        let category: PIICategory = 'PASSWORD_SECRET';
        if (keyword.includes('cvv') || keyword.includes('cvc')) category = 'CVV';
        else if (keyword.includes('card')) category = 'CREDIT_CARD';
        else if (keyword.includes('aadhaar')) category = 'AADHAAR_NUMBER';
        else if (keyword.includes('pan')) category = 'PAN_NUMBER';
        else if (keyword.includes('otp') || keyword.includes('one-time')) category = 'OTP';
        else if (keyword.includes('ifsc')) category = 'IFSC_CODE';
        else if (keyword.includes('bank') || keyword.includes('account')) category = 'BANK_ACCOUNT';

        const val = element.attributes['value'] || element.text || keyword;
        results.push({
          id: `dom_attr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category,
          rawText: val,
          token: `<PII:${category}_DOM>`,
          confidence: 0.95,
          source: 'DOM_ATTRIBUTE',
          domSelector: element.selector,
          bbox: element.bbox,
          ruleMatched: `Sensitive attribute: ${keyword}`,
          isVerified: true
        });
        break;
      }
    }

    // Also scan inner text if any
    if (element.text) {
      const textEntities = this.detectInText(element.text, 'DOM_TEXT', element.selector, element.bbox);
      results.push(...textEntities);
    }

    return results;
  }

  /**
   * Correlates M4 OCR output with spatial bounding boxes
   */
  public correlateOCRBoxes(
    ocrBoxes: Array<{ text: string; bbox: BoundingBox; confidence: number }> = []
  ): DetectedEntity[] {
    const results: DetectedEntity[] = [];
    if (!ocrBoxes || !Array.isArray(ocrBoxes)) return results;

    for (const box of ocrBoxes) {
      const textEntities = this.detectInText(box.text, 'OCR_VISION', undefined, box.bbox);
      if (textEntities.length > 0) {
        // Boost confidence if visual detection matches rule pattern
        textEntities.forEach(e => {
          e.bbox = box.bbox;
          e.confidence = Math.min(1.0, (e.confidence + box.confidence) / 2);
        });
        results.push(...textEntities);
      } else {
        // Contextual trigger: check if text indicates a label for upcoming value
        const lower = box.text.toLowerCase();
        if (lower.includes('cvv') || lower.includes('aadhaar') || lower.includes('pan card') || lower.includes('card number')) {
          results.push({
            id: `ocr_label_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            category: lower.includes('cvv') || lower.includes('card') ? 'CREDIT_CARD' : 'AADHAAR_NUMBER',
            rawText: box.text,
            token: `<PII:SENSITIVE_LABEL>`,
            confidence: 0.88,
            source: 'OCR_VISION',
            bbox: box.bbox,
            ruleMatched: `OCR sensitive label: ${box.text}`,
            isVerified: true
          });
        }
      }
    }

    return results;
  }
}
