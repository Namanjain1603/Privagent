import { SanitizedElement } from '../schemas/input.schema.js';
import { M1Reasoning } from '../schemas/plan.schema.js';

export interface DecomposedTask {
  intent: string;
  subGoals: string[];
  matchedElements: SanitizedElement[];
  unmatchedPhrases: string[];
}

/**
 * Heuristically parses instructions (English & Hinglish) to extract sub-goals
 * and map them to sanitized DOM elements. Used for context enrichment,
 * mock fallback reasoning in test environments, and intent validation.
 */
export function decomposeInstruction(
  instruction: string,
  elements: SanitizedElement[]
): DecomposedTask {
  const normalized = instruction.trim();
  const subGoals: string[] = [];
  const matchedElements: SanitizedElement[] = [];
  const unmatchedPhrases: string[] = [];

  // Split by common sequential conjunctions in English and Hinglish
  // e.g., "aur", "and", "then", "fir", "ke baad", "after", ",", ";"
  const segments = normalized
    .split(/\s+(?:aur|and|then|fir|phir|ke baad|after)\s+|[,;]\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const segment of segments) {
    let matched = false;
    const lowerSegment = segment.toLowerCase();

    // Check if segment matches an element label, id, or option
    for (const el of elements) {
      const elLabel = (el.label || '').toLowerCase();
      const elId = el.id.toLowerCase();
      const elPlaceholder = (el.placeholder || '').toLowerCase();

      // Check if options match (for select)
      let optionMatch = false;
      if (el.type === 'select' && el.options) {
        optionMatch = el.options.some((opt) => lowerSegment.includes(opt.toLowerCase()));
      }

      if (
        (elLabel && lowerSegment.includes(elLabel)) ||
        (elId && lowerSegment.includes(elId)) ||
        (elPlaceholder && lowerSegment.includes(elPlaceholder)) ||
        optionMatch
      ) {
        if (!matchedElements.some((m) => m.id === el.id)) {
          matchedElements.push(el);
        }
        subGoals.push(`Act on '${el.label || el.id}' (${el.type}) for: "${segment}"`);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check for navigation or scroll keywords
      if (/scroll|neeche|upar|bottom|top/i.test(lowerSegment)) {
        subGoals.push(`Scroll page: "${segment}"`);
      } else if (/navigate|go to|open|kholo/i.test(lowerSegment)) {
        subGoals.push(`Navigate URL: "${segment}"`);
      } else {
        unmatchedPhrases.push(segment);
      }
    }
  }

  return {
    intent: `Execute: ${normalized}`,
    subGoals: subGoals.length > 0 ? subGoals : [normalized],
    matchedElements,
    unmatchedPhrases,
  };
}

/**
 * Builds structured M1 reasoning block
 */
export function buildReasoningBlock(
  instruction: string,
  elements: SanitizedElement[],
  plannedActionDescriptions: string[]
): M1Reasoning {
  const decomposed = decomposeInstruction(instruction, elements);

  return {
    intent: decomposed.intent,
    subGoals:
      plannedActionDescriptions.length > 0
        ? plannedActionDescriptions
        : decomposed.subGoals,
    contextSummary: `Observed ${elements.length} interactable DOM element(s). Matched ${decomposed.matchedElements.length} candidate(s).`,
  };
}
