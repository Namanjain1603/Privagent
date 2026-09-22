/**
 * PRIVAGENT - Privacy-First Visual Browser Agent (SIH 2026)
 * Member 4 Module: OCR & Vision
 * 
 * Minimal Automated Verification Test Suite
 * Tests Core Math, Natural Dimension Resolution, Hierarchical Parsing,
 * DPR Viewport Targeting, and Sensitive Data Heuristics.
 */

import assert from 'node:assert';
import {
  normalizeCoordinates,
  normalizeOcrResults,
  extractLinesFromTesseractData,
  extractWordsFromTesseractData,
  calculateM3ActionTarget,
  RawTesseractData
} from '../src/services/detectionNormalizer';
import { imageElementWidth, imageElementHeight } from '../src/services/ocrService';
import { detectPossibleSensitivePatterns } from '../src/services/sensitiveSignals';
import { OcrDetection } from '../src/types/privagent';

console.log('--- PRIVAGENT M4 Automated Verification Suite ---');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

// ============================================================================
// TEST A: Coordinate Normalization & Boundary Clamping
// ============================================================================
test('Test A: Coordinate Normalization & Boundary Clamping', () => {
  const rawBbox = {
    x0: -5,
    y0: 10,
    x1: 1950,
    y1: 1100
  };
  const imageWidth = 1920;
  const imageHeight = 1080;

  const { pixelBox, normalizedBox } = normalizeCoordinates(rawBbox, imageWidth, imageHeight);

  // 1. X and Y should be safely clamped to non-negative bounds
  assert.strictEqual(pixelBox.x, 0, 'pixelBox.x should be clamped to 0 when raw x0 is negative');
  assert.strictEqual(pixelBox.y, 10, 'pixelBox.y should preserve valid y0 = 10');

  // 2. Width and height should be clamped within image dimensions
  assert.ok(pixelBox.x + pixelBox.width <= imageWidth, 'Box right edge cannot exceed image width (1920)');
  assert.ok(pixelBox.y + pixelBox.height <= imageHeight, 'Box bottom edge cannot exceed image height (1080)');

  // 3. Normalized coordinates must strictly reside in [0.0, 1.0]
  assert.ok(normalizedBox.normalizedX >= 0 && normalizedBox.normalizedX <= 1, 'normX must be in [0.0, 1.0]');
  assert.ok(normalizedBox.normalizedY >= 0 && normalizedBox.normalizedY <= 1, 'normY must be in [0.0, 1.0]');
  assert.ok(normalizedBox.normalizedWidth >= 0 && normalizedBox.normalizedWidth <= 1, 'normW must be in [0.0, 1.0]');
  assert.ok(normalizedBox.normalizedHeight >= 0 && normalizedBox.normalizedHeight <= 1, 'normH must be in [0.0, 1.0]');
  assert.ok(normalizedBox.normalizedX + normalizedBox.normalizedWidth <= 1.0001, 'normX + normW must not exceed 1.0');
  assert.ok(normalizedBox.normalizedY + normalizedBox.normalizedHeight <= 1.0001, 'normY + normH must not exceed 1.0');
});

// ============================================================================
// TEST B: Natural Image Dimensions vs CSS Display Dimensions
// ============================================================================
test('Test B: Natural Image Dimensions vs Display Dimensions', () => {
  // Simulate an HTMLImageElement with high-res natural dimensions and downscaled CSS layout
  const simulatedImage = {
    naturalWidth: 1920,
    naturalHeight: 1080,
    width: 480,    // CSS display width
    height: 270    // CSS display height
  } as unknown as HTMLImageElement;

  const resolvedWidth = imageElementWidth(simulatedImage);
  const resolvedHeight = imageElementHeight(simulatedImage);

  assert.strictEqual(resolvedWidth, 1920, 'Should extract naturalWidth 1920, NOT CSS width 480');
  assert.strictEqual(resolvedHeight, 1080, 'Should extract naturalHeight 1080, NOT CSS height 270');

  // Also simulate fallback when naturalWidth is absent (e.g. HTMLCanvasElement)
  const simulatedCanvas = {
    width: 800,
    height: 600
  } as unknown as HTMLCanvasElement;

  assert.strictEqual(imageElementWidth(simulatedCanvas), 800, 'Should fallback to canvas.width when naturalWidth absent');
  assert.strictEqual(imageElementHeight(simulatedCanvas), 600, 'Should fallback to canvas.height when naturalHeight absent');
});

// ============================================================================
// TEST C: Hierarchical Tesseract Parsing (Blocks -> Paragraphs -> Lines -> Words)
// ============================================================================
test('Test C: Hierarchical Tesseract Parsing', () => {
  const mockTesseractData: RawTesseractData = {
    text: 'Pay Now $45.00',
    confidence: 92,
    blocks: [
      {
        text: 'Pay Now $45.00',
        confidence: 92,
        paragraphs: [
          {
            text: 'Pay Now $45.00',
            confidence: 92,
            lines: [
              {
                text: 'Pay Now $45.00',
                confidence: 94,
                bbox: { x0: 100, y0: 200, x1: 350, y1: 240 },
                words: [
                  { text: 'Pay', confidence: 96, bbox: { x0: 100, y0: 200, x1: 170, y1: 240 } },
                  { text: 'Now', confidence: 95, bbox: { x0: 180, y0: 200, x1: 250, y1: 240 } },
                  { text: '$45.00', confidence: 91, bbox: { x0: 260, y0: 200, x1: 350, y1: 240 } }
                ]
              }
            ]
          }
        ]
      }
    ]
  };

  // Test line extraction
  const extractedLines = extractLinesFromTesseractData(mockTesseractData);
  assert.strictEqual(extractedLines.length, 1, 'Should extract exactly 1 line from hierarchy');
  assert.strictEqual(extractedLines[0].text, 'Pay Now $45.00');

  // Test word extraction
  const extractedWords = extractWordsFromTesseractData(mockTesseractData, extractedLines);
  assert.strictEqual(extractedWords.length, 3, 'Should extract 3 words from line');
  assert.strictEqual(extractedWords[0].word.text, 'Pay');
  assert.strictEqual(extractedWords[2].word.text, '$45.00');

  // Test full normalization
  const detections = normalizeOcrResults(mockTesseractData, 1280, 720, { granularity: 'both' });
  assert.strictEqual(detections.length, 4, 'Should contain 1 line + 3 words = 4 detections in both mode');
  
  const lineDetection = detections.find((d) => d.type === 'line');
  assert.ok(lineDetection, 'Line detection must exist');
  assert.strictEqual(lineDetection?.text, 'Pay Now $45.00');
  assert.strictEqual(lineDetection?.boundingBox.width, 250);
});

// ============================================================================
// TEST D: Sensitive Heuristic Pattern Detection (Pre-M2 Demonstrator)
// ============================================================================
test('Test D: Sensitive Heuristic Pattern Detection', () => {
  const testCases: { text: string; expectedType?: string }[] = [
    { text: 'Contact admin at security@privagent.local for details', expectedType: 'email' },
    { text: 'Customer support hotline: +91 98765 43210', expectedType: 'phone' },
    { text: 'Permanent Account Number: ABCDE1234F', expectedType: 'pan_card' },
    { text: 'UIDAI Aadhaar Number: 4521 8932 1042', expectedType: 'aadhaar_card' },
    { text: 'Standard non-sensitive button label: Proceed to Checkout', expectedType: undefined }
  ];

  const dummyDetections: OcrDetection[] = testCases.map((tc, idx) => ({
    id: `m4-line-${idx}`,
    text: tc.text,
    type: 'line',
    boundingBox: { x: 10, y: 10 * idx, width: 200, height: 20 },
    normalizedBox: { normalizedX: 0.01, normalizedY: 0.01 * idx, normalizedWidth: 0.2, normalizedHeight: 0.02 },
    confidence: 90
  }));

  const flaggedDetections = detectPossibleSensitivePatterns(dummyDetections);

  // Verify email detection
  const emailItem = flaggedDetections.find((d) => d.text.includes('security@privagent.local'));
  assert.strictEqual(emailItem?.sensitiveSignal?.type, 'email', 'Email must be flagged as email signal');

  // Verify phone detection
  const phoneItem = flaggedDetections.find((d) => d.text.includes('+91 98765 43210'));
  assert.strictEqual(phoneItem?.sensitiveSignal?.type, 'phone', 'Phone must be flagged as phone signal');

  // Verify PAN detection
  const panItem = flaggedDetections.find((d) => d.text.includes('ABCDE1234F'));
  assert.strictEqual(panItem?.sensitiveSignal?.type, 'pan_card', 'PAN must be flagged as pan_card signal');

  // Verify Aadhaar detection
  const aadhaarItem = flaggedDetections.find((d) => d.text.includes('4521 8932 1042'));
  assert.strictEqual(aadhaarItem?.sensitiveSignal?.type, 'aadhaar_card', 'Aadhaar must be flagged as aadhaar_card signal');

  // Verify non-sensitive item is not flagged
  const cleanItem = flaggedDetections.find((d) => d.text.includes('Proceed to Checkout'));
  assert.strictEqual(cleanItem?.sensitiveSignal, undefined, 'Ordinary text must NOT be flagged as sensitive');
});

// ============================================================================
// TEST E: Device Pixel Ratio (DPR = 2) & M3 Action Targeting
// ============================================================================
test('Test E: DPR = 2 & Member 3 Action Targeting', () => {
  // Scenario:
  // Native screenshot resolution: 2560 × 1600
  // Browser CSS viewport resolution: 1280 × 800
  // devicePixelRatio: 2.0
  // Bounding box: centered at (1280, 800) with width 200, height 100
  // Box: x=1180, y=750, w=200, h=100 -> center = (1280, 800)
  const detection: OcrDetection = {
    id: 'm4-line-0042',
    text: 'Submit Application',
    type: 'line',
    boundingBox: { x: 1180, y: 750, width: 200, height: 100 },
    normalizedBox: {
      normalizedX: 1180 / 2560,
      normalizedY: 750 / 1600,
      normalizedWidth: 200 / 2560,
      normalizedHeight: 100 / 1600
    },
    confidence: 95
  };

  const dpr = 2.0;
  const m3Target = calculateM3ActionTarget(detection, dpr);

  // 1. Raw click point must remain in unscaled screenshot pixels
  assert.strictEqual(m3Target.clickPoint.x, 1280, 'Raw click point X must be 1280px');
  assert.strictEqual(m3Target.clickPoint.y, 800, 'Raw click point Y must be 800px');

  // 2. Normalized click point must be exactly center [0.5, 0.5] and NOT divided by DPR
  assert.strictEqual(m3Target.normalizedClickPoint.x, 0.5, 'Normalized click point X must be 0.5');
  assert.strictEqual(m3Target.normalizedClickPoint.y, 0.5, 'Normalized click point Y must be 0.5');

  // 3. Viewport click point must be converted to CSS coordinates (raw / DPR)
  assert.strictEqual(m3Target.viewportClickPoint.x, 640, 'Viewport click point X must be 640px (1280 / 2)');
  assert.strictEqual(m3Target.viewportClickPoint.y, 400, 'Viewport click point Y must be 400px (800 / 2)');
  assert.strictEqual(m3Target.devicePixelRatio, 2.0, 'DPR metadata must be preserved');
});

console.log(`\nAll ${passedTests}/${totalTests} verification tests passed successfully!`);
