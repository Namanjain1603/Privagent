/**
 * PRIVAGENT - Privacy-First Visual Browser Agent (SIH 2026)
 * Member 4 Module: OCR & Vision
 * 
 * SENSITIVE DATA DEMONSTRATION HEURISTIC
 * 
 * DISCLAIMER:
 * This is an optional local heuristic demonstration only. It uses basic regex
 * patterns to flag potential matches for preview purposes. It is NOT a verified
 * identity detector, cryptographic validator, or complete PII classifier.
 * Official masking and policy enforcement is owned by Member 2 (Privacy Guard Module).
 */

import { OcrDetection, SensitiveSignal } from '../types/privagent';

// Local pattern definitions for demonstration
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
// Phone: Indian mobile (starts with 6-9, 10 digits with optional 5-5 grouping or country code) or generic phone
const PHONE_IN_REGEX = /(?:\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5}|(?:\+91[\s-]?)?[6789]\d{9}/;
const PHONE_GENERIC_REGEX = /\b(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}\b/;
// India PAN Card: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F)
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/;
// India Aadhaar number: 12 digits, often grouped in 4-4-4 (e.g. 1234 5678 9012)
const AADHAAR_REGEX = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
// Payment Card: 16 digits often grouped in 4-4-4-4
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/;

/**
 * Evaluates text against local demonstration patterns.
 * Never transmits text anywhere; runs purely in-memory.
 */
export function evaluateSensitiveSignal(text: string): SensitiveSignal | undefined {
  if (!text || text.trim().length === 0) return undefined;
  const clean = text.trim();

  // Check Email
  const emailMatch = clean.match(EMAIL_REGEX);
  if (emailMatch) {
    return {
      type: 'email',
      patternName: 'Email Pattern',
      matchedSnippet: emailMatch[0],
      confidence: 88,
      note: 'Possible email address heuristic. Pending M2 privacy verification.'
    };
  }

  // Check PAN format (high specificity regex)
  const panMatch = clean.match(PAN_REGEX);
  if (panMatch) {
    return {
      type: 'pan_card',
      patternName: 'PAN-like Format (IN)',
      matchedSnippet: panMatch[0],
      confidence: 85,
      note: '5 alpha + 4 digit + 1 alpha pattern. Demonstration heuristic.'
    };
  }

  // Check Aadhaar format (12 digits)
  const aadhaarMatch = clean.match(AADHAAR_REGEX);
  if (aadhaarMatch && aadhaarMatch[0].replace(/[\s-]/g, '').length === 12) {
    return {
      type: 'aadhaar_card',
      patternName: 'Aadhaar-like 12-Digit Pattern',
      matchedSnippet: aadhaarMatch[0],
      confidence: 78,
      note: '12-digit sequence matching Aadhaar structure. Heuristic only.'
    };
  }

  // Check Credit/Debit Card (16 digits)
  const cardMatch = clean.match(CREDIT_CARD_REGEX);
  if (cardMatch && cardMatch[0].replace(/[\s-]/g, '').length === 16) {
    return {
      type: 'credit_card',
      patternName: 'Card Number Format (16-Digit)',
      matchedSnippet: cardMatch[0],
      confidence: 82,
      note: '16-digit card block pattern. Demonstration heuristic.'
    };
  }

  // Check Phone number
  const phoneInMatch = clean.match(PHONE_IN_REGEX);
  if (phoneInMatch) {
    return {
      type: 'phone',
      patternName: 'Phone Number (IN/Intl)',
      matchedSnippet: phoneInMatch[0],
      confidence: 80,
      note: '10-digit telephone pattern. Demonstration heuristic.'
    };
  }

  const phoneGenericMatch = clean.match(PHONE_GENERIC_REGEX);
  if (phoneGenericMatch) {
    return {
      type: 'phone',
      patternName: 'Standard Phone Pattern',
      matchedSnippet: phoneGenericMatch[0],
      confidence: 75,
      note: 'Standard phone structure pattern. Demonstration heuristic.'
    };
  }

  return undefined;
}

/**
 * Enriches detection items with demonstration heuristic signals.
 */
export function detectPossibleSensitivePatterns(detections: OcrDetection[]): OcrDetection[] {
  return detections.map(item => {
    const signal = evaluateSensitiveSignal(item.text);
    return {
      ...item,
      sensitiveSignal: signal
    };
  });
}
