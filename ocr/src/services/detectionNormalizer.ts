/**
 * PRIVAGENT - Privacy-First Visual Browser Agent (SIH 2026)
 * Member 4 Module: OCR & Vision
 * 
 * DETECTION NORMALIZER
 * Converts raw OCR engine structures to standardized PRIVAGENT detection contracts.
 * Coordinates are mapped to original image dimensions:
 * - Pixel bounding box: { x, y, width, height }
 * - Normalized bounding box: { normalizedX, normalizedY, normalizedWidth, normalizedHeight } in range [0, 1]
 */

import { BoundingBox, M3BrowserActionTarget, NormalizedBoundingBox, OcrDetection } from '../types/privagent';

export interface RawBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface RawWord {
  text: string;
  confidence: number;
  bbox: RawBbox;
  [key: string]: any;
}

export interface RawLine {
  text: string;
  confidence: number;
  bbox: RawBbox;
  words?: RawWord[];
  [key: string]: any;
}

export interface RawParagraph {
  text?: string;
  confidence?: number;
  bbox?: RawBbox;
  lines?: RawLine[];
  [key: string]: any;
}

export interface RawBlock {
  text?: string;
  confidence?: number;
  bbox?: RawBbox;
  paragraphs?: RawParagraph[];
  lines?: RawLine[];
  [key: string]: any;
}

export interface RawTesseractData {
  text?: string | null;
  confidence?: number | null;
  blocks?: RawBlock[] | null;
  lines?: RawLine[] | null;
  words?: RawWord[] | null;
  paragraphs?: RawParagraph[] | null;
  [key: string]: any;
}

/**
 * Robustly extracts all text lines from Tesseract.js data structure.
 * Supports:
 * 1. Root-level `lines` array (if present in specific Tesseract outputs or custom adapters)
 * 2. Hierarchical `blocks -> paragraphs -> lines` (the standard structure in Tesseract.js v5/v6/v7)
 * 3. `blocks -> lines` (some alternate block definitions)
 * 4. Root-level `paragraphs -> lines`
 */
export function extractLinesFromTesseractData(rawResults: RawTesseractData): RawLine[] {
  if (!rawResults) return [];

  // 1. Direct lines array on root
  if (Array.isArray(rawResults.lines) && rawResults.lines.length > 0) {
    return rawResults.lines.filter((l) => l && l.bbox && typeof l.text === 'string');
  }

  // 2. Hierarchical blocks -> paragraphs -> lines (standard in Tesseract.js v5/v6/v7)
  if (Array.isArray(rawResults.blocks) && rawResults.blocks.length > 0) {
    const lines: RawLine[] = [];
    for (const block of rawResults.blocks) {
      if (!block) continue;

      if (Array.isArray(block.paragraphs) && block.paragraphs.length > 0) {
        for (const para of block.paragraphs) {
          if (!para) continue;
          if (Array.isArray(para.lines) && para.lines.length > 0) {
            for (const line of para.lines) {
              if (line && line.bbox && typeof line.text === 'string') {
                lines.push(line);
              }
            }
          }
        }
      } else if (Array.isArray(block.lines) && block.lines.length > 0) {
        for (const line of block.lines) {
          if (line && line.bbox && typeof line.text === 'string') {
            lines.push(line);
          }
        }
      }
    }
    if (lines.length > 0) return lines;
  }

  // 3. Fallback: paragraphs on root
  if (Array.isArray(rawResults.paragraphs) && rawResults.paragraphs.length > 0) {
    const lines: RawLine[] = [];
    for (const para of rawResults.paragraphs) {
      if (!para) continue;
      if (Array.isArray(para.lines) && para.lines.length > 0) {
        for (const line of para.lines) {
          if (line && line.bbox && typeof line.text === 'string') {
            lines.push(line);
          }
        }
      }
    }
    if (lines.length > 0) return lines;
  }

  return [];
}

/**
 * Robustly extracts all words with their line index from Tesseract.js data structure.
 */
export function extractWordsFromTesseractData(
  rawResults: RawTesseractData,
  lines: RawLine[]
): { word: RawWord; lineIndex: number; wordIndex: number }[] {
  const result: { word: RawWord; lineIndex: number; wordIndex: number }[] = [];

  // 1. If words are nested inside the extracted lines (standard in Tesseract.js)
  if (lines.length > 0) {
    lines.forEach((line, lineIdx) => {
      if (Array.isArray(line.words) && line.words.length > 0) {
        line.words.forEach((w, wordIdx) => {
          if (w && w.bbox && typeof w.text === 'string') {
            result.push({
              word: w,
              lineIndex: lineIdx,
              wordIndex: wordIdx
            });
          }
        });
      }
    });

    if (result.length > 0) return result;
  }

  // 2. Direct words array on root
  if (Array.isArray(rawResults.words) && rawResults.words.length > 0) {
    rawResults.words.forEach((w, idx) => {
      if (w && w.bbox && typeof w.text === 'string') {
        result.push({
          word: w,
          lineIndex: typeof w.line_index === 'number' ? w.line_index : 0,
          wordIndex: idx
        });
      }
    });
  }

  return result;
}

/**
 * Maps raw bbox (x0, y0, x1, y1) to standard BoundingBox and NormalizedBoundingBox
 * Clamps coordinates strictly within original image boundaries [0, 0, width, height]
 * and computes viewport click point adjusted by devicePixelRatio.
 */
export function normalizeCoordinates(
  bbox: RawBbox,
  imageWidth: number,
  imageHeight: number,
  devicePixelRatio: number = 1
): {
  pixelBox: BoundingBox;
  normalizedBox: NormalizedBoundingBox;
  viewportClickPoint: { x: number; y: number };
} {
  const safeWidth = Math.max(1, imageWidth);
  const safeHeight = Math.max(1, imageHeight);
  const dpr = Math.max(0.1, devicePixelRatio || 1);

  // 1. Clamp raw coordinates strictly to image boundaries
  const clampedX0 = Math.max(0, Math.min(safeWidth, bbox.x0));
  const clampedY0 = Math.max(0, Math.min(safeHeight, bbox.y0));
  const clampedX1 = Math.max(clampedX0, Math.min(safeWidth, bbox.x1));
  const clampedY1 = Math.max(clampedY0, Math.min(safeHeight, bbox.y1));

  const x = Math.round(clampedX0);
  const y = Math.round(clampedY0);
  const w = Math.max(1, Math.min(safeWidth - x, Math.round(clampedX1 - clampedX0)));
  const h = Math.max(1, Math.min(safeHeight - y, Math.round(clampedY1 - clampedY0)));

  const pixelBox: BoundingBox = {
    x,
    y,
    width: w,
    height: h
  };

  // 2. Normalized coordinates strictly clamped to [0.0, 1.0]
  const normX = Math.max(0, Math.min(1, Number((x / safeWidth).toFixed(5))));
  const normY = Math.max(0, Math.min(1, Number((y / safeHeight).toFixed(5))));
  const normW = Math.max(0, Math.min(1 - normX, Number((w / safeWidth).toFixed(5))));
  const normH = Math.max(0, Math.min(1 - normY, Number((h / safeHeight).toFixed(5))));

  const normalizedBox: NormalizedBoundingBox = {
    normalizedX: normX,
    normalizedY: normY,
    normalizedWidth: normW,
    normalizedHeight: normH
  };

  // 3. Viewport click coordinates in CSS space (divided by DPR)
  const rawCenterX = x + w / 2;
  const rawCenterY = y + h / 2;
  const viewportClickPoint = {
    x: Number((rawCenterX / dpr).toFixed(1)),
    y: Number((rawCenterY / dpr).toFixed(1))
  };

  return { pixelBox, normalizedBox, viewportClickPoint };
}

/**
 * Calculates deterministic action targeting for Member 3 (Browser Automation).
 * - ClickPoint: Native screenshot pixels
 * - ViewportClickPoint: Scaled to CSS viewport coordinates (clickPoint / DPR)
 * - NormalizedClickPoint: Unit scale [0.0 - 1.0] (NOT divided by DPR)
 */
export function calculateM3ActionTarget(
  detection: OcrDetection,
  devicePixelRatio: number = 1
): M3BrowserActionTarget {
  const dpr = Math.max(0.1, devicePixelRatio || 1);
  const rawCenterX = Math.round(detection.boundingBox.x + detection.boundingBox.width / 2);
  const rawCenterY = Math.round(detection.boundingBox.y + detection.boundingBox.height / 2);

  // Normalized coordinates remain strictly [0.0 - 1.0] and are NOT divided by DPR
  const normalizedCenterX = Number(
    (detection.normalizedBox.normalizedX + detection.normalizedBox.normalizedWidth / 2).toFixed(5)
  );
  const normalizedCenterY = Number(
    (detection.normalizedBox.normalizedY + detection.normalizedBox.normalizedHeight / 2).toFixed(5)
  );

  // Viewport click coordinates in CSS pixels are divided by DPR
  const viewportX = Number((rawCenterX / dpr).toFixed(1));
  const viewportY = Number((rawCenterY / dpr).toFixed(1));

  return {
    targetElementId: detection.id,
    clickPoint: { x: rawCenterX, y: rawCenterY },
    viewportClickPoint: { x: viewportX, y: viewportY },
    normalizedClickPoint: { x: normalizedCenterX, y: normalizedCenterY },
    devicePixelRatio: dpr,
    expectedText: detection.text
  };
}

/**
 * Normalizes raw Tesseract output into standardized PRIVAGENT OcrDetection array.
 */
export function normalizeOcrResults(
  rawResults: RawTesseractData,
  imageWidth: number,
  imageHeight: number,
  options: { granularity: 'words' | 'lines' | 'both'; devicePixelRatio?: number } = {
    granularity: 'lines',
    devicePixelRatio: 1
  }
): OcrDetection[] {
  const detections: OcrDetection[] = [];
  let itemCounter = 0;
  const dpr = options.devicePixelRatio || 1;

  const lines = extractLinesFromTesseractData(rawResults);
  const words = extractWordsFromTesseractData(rawResults, lines);

  // If granularity includes lines
  if (options.granularity === 'lines' || options.granularity === 'both') {
    lines.forEach((line, lineIdx) => {
      const cleanText = (line.text || '').replace(/[\r\n]+/g, ' ').trim();
      if (!cleanText) return;

      const { pixelBox, normalizedBox, viewportClickPoint } = normalizeCoordinates(
        line.bbox,
        imageWidth,
        imageHeight,
        dpr
      );
      itemCounter++;

      detections.push({
        id: `m4-line-${itemCounter.toString().padStart(4, '0')}`,
        text: cleanText,
        type: 'line',
        boundingBox: pixelBox,
        normalizedBox,
        viewportClickPoint,
        confidence: Math.max(0, Math.min(100, Math.round(line.confidence || 0))),
        lineIndex: lineIdx
      });
    });
  }

  // If granularity includes words
  if (options.granularity === 'words' || options.granularity === 'both') {
    words.forEach((item) => {
      const cleanText = (item.word.text || '').trim();
      if (!cleanText) return;

      const { pixelBox, normalizedBox, viewportClickPoint } = normalizeCoordinates(
        item.word.bbox,
        imageWidth,
        imageHeight,
        dpr
      );
      itemCounter++;

      detections.push({
        id: `m4-word-${itemCounter.toString().padStart(4, '0')}`,
        text: cleanText,
        type: 'word',
        boundingBox: pixelBox,
        normalizedBox,
        viewportClickPoint,
        confidence: Math.max(0, Math.min(100, Math.round(item.word.confidence || 0))),
        lineIndex: item.lineIndex,
        wordIndex: item.wordIndex
      });
    });
  }

  return detections;
}
