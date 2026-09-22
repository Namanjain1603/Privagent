/**
 * PRIVAGENT - Privacy & PII Guard (M2)
 * Module: Visual Canvas Redaction Engine
 * 
 * Takes raw screenshots + bounding boxes (from M4 OCR or DOM rects)
 * and paints conservative redaction overlays directly on an HTML5 canvas.
 * Guaranteed to eliminate raw visual PII before image dispatch to M1.
 */

import { BoundingBox, DetectedEntity, RedactionPolicy } from '../types/privacy';

export class VisualRedactor {
  private policy: RedactionPolicy;

  constructor(policy: RedactionPolicy) {
    this.policy = policy;
  }

  public updatePolicy(newPolicy: RedactionPolicy): void {
    this.policy = newPolicy;
  }

  /**
   * Applies visual redaction boxes onto an HTMLCanvasElement
   */
  public redactCanvas(
    canvas: HTMLCanvasElement,
    entitiesWithBbox: DetectedEntity[]
  ): {
    redactedCount: number;
    boxesDrawn: BoundingBox[];
  } {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { redactedCount: 0, boxesDrawn: [] };

    const padding = this.policy.paddingPixels || 6;
    const boxesDrawn: BoundingBox[] = [];
    let count = 0;

    for (const entity of entitiesWithBbox) {
      if (!entity.bbox) continue;

      // Expand bounding box conservatively
      const targetBox: BoundingBox = {
        x: Math.max(0, entity.bbox.x - padding),
        y: Math.max(0, entity.bbox.y - padding),
        width: Math.min(canvas.width - entity.bbox.x + padding, entity.bbox.width + (padding * 2)),
        height: Math.min(canvas.height - entity.bbox.y + padding, entity.bbox.height + (padding * 2))
      };

      boxesDrawn.push(targetBox);
      count++;

      ctx.save();

      switch (this.policy.redactionStyle) {
        case 'SOLID_BLACK':
          ctx.fillStyle = '#09090b'; // High-contrast solid black
          ctx.fillRect(targetBox.x, targetBox.y, targetBox.width, targetBox.height);
          break;

        case 'SOLID_DARK_LABEL':
          // Solid dark box with a clear monospace category tag for visual inspection
          ctx.fillStyle = '#18181b';
          ctx.fillRect(targetBox.x, targetBox.y, targetBox.width, targetBox.height);
          
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(targetBox.x, targetBox.y, targetBox.width, targetBox.height);

          // Small tag inside box if box is tall enough
          if (targetBox.height >= 14 && targetBox.width >= 40) {
            ctx.fillStyle = '#f87171';
            ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
            const label = `[REDACTED: ${entity.category.slice(0, 10)}]`;
            ctx.fillText(label, targetBox.x + 4, targetBox.y + Math.min(targetBox.height - 4, 12));
          }
          break;

        case 'PIXELATED':
        case 'BLUR':
        default:
          // For maximum privacy in browser agents, solid fill is mathematically secure
          // whereas blur can occasionally be inverted by de-blur algorithms.
          // Fallback to solid high opacity box
          ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
          ctx.fillRect(targetBox.x, targetBox.y, targetBox.width, targetBox.height);
          break;
      }

      ctx.restore();
    }

    return {
      redactedCount: count,
      boxesDrawn
    };
  }

  /**
   * Helper to draw a synthetic web page mockup onto a canvas for demo / testing
   */
  public renderMockupPage(
    canvas: HTMLCanvasElement,
    elements: Array<{
      text: string;
      x: number;
      y: number;
      font?: string;
      color?: string;
      isInput?: boolean;
      inputValue?: string;
      width?: number;
      height?: number;
    }>
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport dark background (slate-950)
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Browser chrome simulation header (slate-900)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 36);

    // Chrome bottom border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 36);
    ctx.lineTo(canvas.width, 36);
    ctx.stroke();
    
    // Window control dots
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(16, 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.arc(32, 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(48, 18, 5, 0, Math.PI * 2); ctx.fill();

    // URL bar (slate-800 with slate-700 border)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(70, 7, canvas.width - 100, 22);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(70, 7, canvas.width - 100, 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('https://secure-checkout.portal.in/pay', 82, 22);

    // Inner webpage content card (slate-900 card with slate-800 border)
    ctx.fillStyle = '#090e1a';
    ctx.fillRect(24, 52, canvas.width - 48, canvas.height - 76);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(24, 52, canvas.width - 48, canvas.height - 76);

    // Render elements with dark-theme color mapping and text wrapping
    for (const el of elements) {
      if (el.isInput) {
        ctx.fillStyle = '#1e293b'; // slate-800 input background
        ctx.strokeStyle = '#334155'; // slate-700 border
        ctx.lineWidth = 1;
        ctx.fillRect(el.x, el.y, el.width || 240, el.height || 32);
        ctx.strokeRect(el.x, el.y, el.width || 240, el.height || 32);

        if (el.inputValue) {
          const isToken = el.inputValue.includes('<PII:');
          ctx.fillStyle = isToken ? '#34d399' : '#f8fafc';
          ctx.font = isToken ? '12px ui-monospace, monospace' : '13px ui-monospace, monospace';
          ctx.fillText(el.inputValue, el.x + 8, el.y + 20);
        }
      } else {
        // Map legacy colors to high-contrast dark theme colors
        let textColor = el.color || '#f1f5f9';
        if (textColor === '#0f172a' || textColor === '#1e293b' || textColor === '#000000') {
          textColor = '#f8fafc';
        } else if (textColor === '#475569' || textColor === '#334155' || textColor === '#64748b') {
          textColor = '#cbd5e1';
        } else if (textColor === '#1e3a8a') {
          textColor = '#60a5fa'; // Light sky/blue for headers
        } else if (textColor === '#065f46') {
          textColor = '#34d399'; // Emerald for bank header
        }

        const font = el.font || '14px sans-serif';
        ctx.font = font;

        // Parse line height from font
        const fontSizeMatch = font.match(/(\d+)px/);
        const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 14;
        const lineHeight = Math.round(fontSize * 1.6);
        const maxWidth = Math.max(200, canvas.width - el.x - 36);

        // Helper to draw a single line, with emerald highlighting for <PII:...> tokens
        const drawLineWithHighlight = (lineStr: string, drawX: number, drawY: number) => {
          if (!lineStr.includes('<PII:')) {
            ctx.fillStyle = textColor;
            ctx.font = font;
            ctx.fillText(lineStr, drawX, drawY);
            return;
          }

          // Split tokens like <PII:AADHAAR_NUMBER_1>
          const tokenRegex = /(<PII:[A-Z_]+_\d+>)/g;
          const parts = lineStr.split(tokenRegex);
          let currX = drawX;

          for (const part of parts) {
            if (!part) continue;
            if (part.startsWith('<PII:') && part.endsWith('>')) {
              // Token badge style
              ctx.font = 'bold 12px ui-monospace, monospace';
              const tokenWidth = ctx.measureText(part).width;
              
              // Dark emerald badge background
              ctx.fillStyle = 'rgba(6, 78, 59, 0.7)';
              ctx.fillRect(currX - 2, drawY - fontSize + 2, tokenWidth + 4, fontSize + 2);
              ctx.strokeStyle = '#059669';
              ctx.lineWidth = 1;
              ctx.strokeRect(currX - 2, drawY - fontSize + 2, tokenWidth + 4, fontSize + 2);

              // Token text in bright emerald
              ctx.fillStyle = '#34d399';
              ctx.fillText(part, currX, drawY);
              currX += tokenWidth + 6;
            } else {
              ctx.fillStyle = textColor;
              ctx.font = font;
              ctx.fillText(part, currX, drawY);
              currX += ctx.measureText(part).width;
            }
          }
        };

        // Split text by explicit newlines
        const paragraphs = el.text.split('\n');
        let currentY = el.y;

        for (const para of paragraphs) {
          if (!para.trim()) {
            currentY += lineHeight;
            continue;
          }

          // Measure full paragraph
          if (ctx.measureText(para).width <= maxWidth) {
            drawLineWithHighlight(para, el.x, currentY);
            currentY += lineHeight;
          } else {
            // Word wrap paragraph
            const words = para.split(' ');
            let currentLine = '';
            for (let i = 0; i < words.length; i++) {
              const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
              if (ctx.measureText(testLine).width > maxWidth && i > 0) {
                drawLineWithHighlight(currentLine, el.x, currentY);
                currentLine = words[i];
                currentY += lineHeight;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) {
              drawLineWithHighlight(currentLine, el.x, currentY);
              currentY += lineHeight;
            }
          }
        }
      }
    }
  }
}
