/**
 * PRIVAGENT - Privacy-First Visual Browser Agent (SIH 2026)
 * Member 4 Module: OCR & Vision
 * 
 * CORE OCR SERVICE
 * 100% Client-Side In-Browser OCR Execution using Tesseract.js (WebAssembly / Web Worker).
 * No images or extracted text are EVER sent to remote servers or vision APIs.
 */

import { createWorker, Worker } from 'tesseract.js';
import {
  OcrDetection,
  OcrProcessingOptions,
  OcrProgressStatus,
  OcrResultBundle
} from '../types/privagent';
import { normalizeOcrResults } from './detectionNormalizer';
import { detectPossibleSensitivePatterns } from './sensitiveSignals';

let cachedWorker: Worker | null = null;
let currentWorkerLang = '';

export interface OcrAssetConfig {
  workerPath?: string;
  corePath?: string;
  langPath?: string;
}

let configuredAssetPaths: OcrAssetConfig | null = null;

/**
 * Configures local/custom asset paths (worker, core WASM, tessdata) for offline use.
 * Terminating any active worker so changes take effect on subsequent runs.
 */
export function configureOcrAssets(config: OcrAssetConfig | null): void {
  configuredAssetPaths = config;
  if (cachedWorker) {
    terminateWorker();
  }
}

export function getOcrAssetConfig(): OcrAssetConfig | null {
  return configuredAssetPaths;
}

/**
 * Accurately extracts native/natural pixel width of an image or canvas element,
 * preventing CSS/styled display dimensions from corrupting OCR coordinates.
 */
export function imageElementWidth(element: HTMLImageElement | HTMLCanvasElement): number {
  if ('naturalWidth' in element && element.naturalWidth) {
    return element.naturalWidth;
  }
  return element.width || 800;
}

/**
 * Accurately extracts native/natural pixel height of an image or canvas element,
 * preventing CSS/styled display dimensions from corrupting OCR coordinates.
 */
export function imageElementHeight(element: HTMLImageElement | HTMLCanvasElement): number {
  if ('naturalHeight' in element && element.naturalHeight) {
    return element.naturalHeight;
  }
  return element.height || 600;
}

/**
 * Preprocesses an image on an offscreen HTML Canvas for OCR enhancement.
 * Supports grayscale, contrast stretching, and optional binarization.
 * Fix 1: Uses true natural pixel dimensions, avoiding display scaling bugs.
 */
export function preprocessImageForOcr(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  options: { enhanceContrast?: boolean; binarize?: boolean }
): HTMLCanvasElement {
  const width = imageElementWidth(imageElement);
  const height = imageElementHeight(imageElement);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  if (!options.enhanceContrast && !options.binarize) {
    return canvas;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Simple contrast stretch factor
  const contrastFactor = options.enhanceContrast ? 1.35 : 1.0;
  const intercept = 128 * (1 - contrastFactor);

  for (let i = 0; i < data.length; i += 4) {
    // Luminance grayscale
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (options.enhanceContrast) {
      gray = contrastFactor * gray + intercept;
      gray = Math.max(0, Math.min(255, gray));
    }

    if (options.binarize) {
      // Adaptive-like binarization around threshold 135
      gray = gray > 135 ? 255 : 0;
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Initializes or retrieves cached Tesseract worker with real-time status logging
 */
async function getOrCreateWorker(
  lang: string = 'eng',
  onProgress?: (p: OcrProgressStatus) => void
): Promise<Worker> {
  if (cachedWorker && currentWorkerLang === lang) {
    return cachedWorker;
  }

  if (cachedWorker) {
    const workerToTerminate = cachedWorker;
    cachedWorker = null;
    currentWorkerLang = '';
    try {
      await workerToTerminate.terminate();
    } catch {
      // ignore
    }
  }

  onProgress?.({
    phase: 'initializing',
    progress: 10,
    message: 'Initializing local Tesseract.js WebAssembly worker...'
  });

  const workerOptions: any = {
    logger: (m: any) => {
      const status = m.status || '';
      const prog = Math.round((m.progress || 0) * 100);

      if (status.includes('load') || status.includes('core')) {
        onProgress?.({
          phase: 'initializing',
          progress: Math.min(30, Math.max(10, prog)),
          message: 'Loading OCR WebAssembly core engine...'
        });
      } else if (status.includes('traineddata') || status.includes('language')) {
        onProgress?.({
          phase: 'loading_model',
          progress: Math.min(60, Math.max(30, prog)),
          message: 'Downloading / loading language model weights locally in browser...'
        });
      } else if (status.includes('recogniz')) {
        onProgress?.({
          phase: 'recognizing',
          progress: Math.min(95, Math.max(60, prog)),
          message: `Recognizing text elements and calculating bounding boxes (${prog}%)...`
        });
      }
    }
  };

  if (configuredAssetPaths?.workerPath) {
    workerOptions.workerPath = configuredAssetPaths.workerPath;
  }
  if (configuredAssetPaths?.corePath) {
    workerOptions.corePath = configuredAssetPaths.corePath;
  }
  if (configuredAssetPaths?.langPath) {
    workerOptions.langPath = configuredAssetPaths.langPath;
  }

  const worker = await createWorker(lang, 1, workerOptions);

  cachedWorker = worker;
  currentWorkerLang = lang;
  return worker;
}

/**
 * Terminates the active worker safely, clearing cached worker reference.
 */
export async function terminateWorker(): Promise<void> {
  if (cachedWorker) {
    const workerToTerminate = cachedWorker;
    cachedWorker = null;
    currentWorkerLang = '';
    try {
      await workerToTerminate.terminate();
    } catch {
      // ignore
    }
  }
}

/**
 * Main function to execute local OCR on a screenshot.
 * Does not transmit any data over the internet.
 */
export async function processScreenshot(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: string;
    devicePixelRatio?: number;
  },
  options: OcrProcessingOptions = {
    language: 'eng',
    granularity: 'lines',
    enhanceContrast: false,
    binarize: false,
    detectSensitiveDemonstration: true,
    devicePixelRatio: 1
  },
  onProgress?: (p: OcrProgressStatus) => void
): Promise<OcrResultBundle> {
  const startTime = performance.now();
  const imageWidth = imageElementWidth(imageSource);
  const imageHeight = imageElementHeight(imageSource);
  const dpr = Math.max(0.1, options.devicePixelRatio || metadata.devicePixelRatio || 1);
  const viewportWidth = Number((imageWidth / dpr).toFixed(1));
  const viewportHeight = Number((imageHeight / dpr).toFixed(1));

  // 1. Preprocessing if requested
  onProgress?.({
    phase: 'initializing',
    progress: 15,
    message: 'Checking image dimensions and preprocessing offscreen canvas...'
  });

  const processedCanvas = preprocessImageForOcr(imageSource, {
    enhanceContrast: options.enhanceContrast,
    binarize: options.binarize
  });

  // 2. Initialize worker
  const worker = await getOrCreateWorker(options.language || 'eng', onProgress);

  // 3. Recognize with blocks enabled to retrieve hierarchical paragraph, line, and word bounding boxes
  onProgress?.({
    phase: 'recognizing',
    progress: 60,
    message: 'Analyzing visual text layout and running Tesseract recognition...'
  });

  const tesseractResult = await worker.recognize(
    processedCanvas,
    {},
    { blocks: true }
  );

  onProgress?.({
    phase: 'normalizing',
    progress: 96,
    message: 'Normalizing bounding box coordinates and detection structures...'
  });

  // 4. Normalize results with DPR support
  let detections: OcrDetection[] = normalizeOcrResults(
    tesseractResult.data as any,
    imageWidth,
    imageHeight,
    { granularity: options.granularity, devicePixelRatio: dpr }
  );

  // 5. Sensitive data demonstration heuristic (if enabled)
  if (options.detectSensitiveDemonstration) {
    detections = detectPossibleSensitivePatterns(detections);
  }

  const durationMs = Math.round(performance.now() - startTime);

  // 6. Summary metrics derived from actual detection results
  const totalDetections = detections.length;
  const lineDetections = detections.filter((d) => d.type === 'line');
  const wordDetections = detections.filter((d) => d.type === 'word');

  const lineCount =
    lineDetections.length > 0
      ? lineDetections.length
      : new Set(
          detections
            .map((d) => d.lineIndex)
            .filter((idx): idx is number => typeof idx === 'number')
        ).size;

  const wordCount =
    wordDetections.length > 0
      ? wordDetections.length
      : detections.reduce(
          (acc, d) =>
            acc + (d.text ? d.text.trim().split(/\s+/).filter(Boolean).length : 0),
          0
        );

  const avgConfidence =
    totalDetections > 0
      ? Math.round(detections.reduce((acc, d) => acc + d.confidence, 0) / totalDetections)
      : 0;

  const heuristicFlaggedCount = detections.filter((d) => Boolean(d.sensitiveSignal)).length;

  const statusMsg =
    totalDetections === 0
      ? (tesseractResult.data.text || '').trim()
        ? 'OCR Complete: Text recognized, but no spatial bounding boxes were detected.'
        : 'OCR Complete: No text detected in image.'
      : `OCR Complete! Found ${totalDetections} detections (${lineCount} lines, ${wordCount} words) in ${durationMs}ms.`;

  onProgress?.({
    phase: 'completed',
    progress: 100,
    message: statusMsg
  });

  return {
    metadata: {
      imageFileName: metadata.fileName,
      imageWidth,
      imageHeight,
      fileSize: metadata.fileSize,
      fileType: metadata.fileType,
      devicePixelRatio: dpr,
      viewportWidth,
      viewportHeight,
      processingTimeMs: durationMs,
      timestamp: new Date().toISOString(),
      engine: 'Tesseract.js (WASM)',
      version: '7.0.0'
    },
    fullText: tesseractResult.data.text || '',
    detections,
    summary: {
      totalDetections,
      wordCount,
      lineCount,
      averageConfidence: avgConfidence,
      heuristicFlaggedCount
    },
    privacyGuarantee: {
      localInBrowser: true,
      remoteVisionApiCalled: false,
      screenshotSentToBackend: false,
      telemetrySent: false,
      wasmExecution: true,
      auditTimestamp: new Date().toISOString()
    }
  };
}
