/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Module: Tokenization & Masking Engine
 * 
 * Manages reversible on-device tokenization:
 * - Replaces raw sensitive values with stable pseudo-tokens (<PII:CATEGORY_INDEX>)
 * - Keeps token map strictly in-memory inside M2 (NEVER transmitted to cloud M1)
 * - Resolves tokens back to actual values when M1 proposes safe TYPE actions
 */

import { DetectedEntity, PIICategory } from '../types/privacy';

export interface TokenMapping {
  token: string;
  rawText: string;
  category: PIICategory;
  createdAt: number;
}

export class MaskingEngine {
  // In-memory strictly local dictionary
  private tokenStore: Map<string, TokenMapping> = new Map();
  private categoryCounters: Map<PIICategory, number> = new Map();

  /**
   * Clears session tokens (e.g. on page navigation or task finish)
   */
  public reset(): void {
    this.tokenStore.clear();
    this.categoryCounters.clear();
  }

  /**
   * Generates or retrieves a deterministic token for a sensitive value
   */
  public getOrCreateToken(rawText: string, category: PIICategory): string {
    // Check if we already tokenized this exact sensitive string in this session
    for (const [token, mapping] of this.tokenStore.entries()) {
      if (mapping.rawText.trim() === rawText.trim() && mapping.category === category) {
        return token;
      }
    }

    const nextIndex = (this.categoryCounters.get(category) || 0) + 1;
    this.categoryCounters.set(category, nextIndex);

    const token = `<PII:${category}_${nextIndex}>`;
    this.tokenStore.set(token, {
      token,
      rawText,
      category,
      createdAt: Date.now()
    });

    return token;
  }

  /**
   * Masks a raw text string by substituting all detected entities with tokens
   */
  public maskString(rawText: string, entities: DetectedEntity[]): {
    maskedText: string;
    replacedCount: number;
    tokensGenerated: string[];
  } {
    let masked = rawText;
    const tokensGenerated: string[] = [];

    // Sort entities by length descending to prevent sub-string collision
    const sorted = [...entities].sort((a, b) => b.rawText.length - a.rawText.length);

    for (const entity of sorted) {
      const token = this.getOrCreateToken(entity.rawText, entity.category);
      tokensGenerated.push(token);

      // Escape regex special chars in raw text
      const escaped = entity.rawText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      masked = masked.replace(regex, token);
    }

    return {
      maskedText: masked,
      replacedCount: tokensGenerated.length,
      tokensGenerated
    };
  }

  /**
   * LOCAL DE-TOKENIZATION GATE:
   * Resolves a token back to its real value for browser execution by M3.
   * STRICT SECURITY: Only callable by M2 internal action dispatcher!
   */
  public resolveToken(token: string): string | null {
    const mapping = this.tokenStore.get(token);
    return mapping ? mapping.rawText : null;
  }

  /**
   * Resolves text containing tokens before sending to local M3 browser input
   */
  public expandTokensInAction(actionText: string): string {
    let resolved = actionText;
    for (const [token, mapping] of this.tokenStore.entries()) {
      if (resolved.includes(token)) {
        resolved = resolved.replaceAll(token, mapping.rawText);
      }
    }
    return resolved;
  }

  /**
   * Returns metadata about tokens WITHOUT raw values (safe for M6 dashboard)
   */
  public getSafeTokenMetadata(): Array<{ token: string; category: PIICategory; createdAt: number }> {
    return Array.from(this.tokenStore.values()).map(m => ({
      token: m.token,
      category: m.category,
      createdAt: m.createdAt
    }));
  }

  public getActiveTokenCount(): number {
    return this.tokenStore.size;
  }
}
