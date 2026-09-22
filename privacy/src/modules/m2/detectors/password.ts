/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Detector: Plain-text Passwords and Secret Credentials
 * 
 * Rules:
 * - Triggered by labels such as "Password:", "Pass:", "Passwd:", "PWD:", "Secret:"
 * - Values must contain typical password characteristics (mixed case, numbers, symbols)
 * - Fully masked to prevent raw leakage
 */

export const PASSWORD_TEXT_REGEX = /(?:(?:Password|Passwd|Pass|PWD|Secret\s+Key|Secret|PIN)\s*[:=]\s*)([^\s,;]+)/gi;

export function isValidPasswordText(value: string): boolean {
  if (!value || value.length < 4) return false;

  // Reject common non-secret labels or placeholder words
  if (/^(?:required|none|null|undefined|yes|no|text|string|true|false|pass|password)$/i.test(value)) {
    return false;
  }

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(value);

  const characteristics = (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSymbol ? 1 : 0);

  return characteristics >= 2 || (characteristics >= 1 && value.length >= 8);
}
