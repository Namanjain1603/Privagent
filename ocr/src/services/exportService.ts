/**
 * PRIVAGENT - Privacy-First Visual Browser Agent (SIH 2026)
 * Member 4 Module: OCR & Vision
 * 
 * EXPORT SERVICE
 * Provides local client-side file downloads (JSON, TXT, CSV)
 * without sending data anywhere.
 */

import { OcrResultBundle, OcrDetection } from '../types/privagent';

/**
 * Initiates browser file download for a blob or string
 */
export function triggerFileDownload(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports complete structured OCR result bundle as formatted JSON
 */
export function exportResultsAsJson(bundle: OcrResultBundle): void {
  const cleanFileName = (bundle.metadata.imageFileName || 'screenshot')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const outputName = `privagent-m4-ocr-${cleanFileName}-${dateStr}.json`;

  const jsonStr = JSON.stringify(bundle, null, 2);
  triggerFileDownload(jsonStr, outputName, 'application/json');
}

/**
 * Exports extracted plain text
 */
export function exportResultsAsText(fullText: string, baseFileName: string = 'screenshot'): void {
  const cleanFileName = baseFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const outputName = `privagent-ocr-text-${cleanFileName}-${dateStr}.txt`;

  triggerFileDownload(fullText, outputName, 'text/plain;charset=utf-8');
}

/**
 * Exports detection table as CSV
 */
export function exportDetectionsAsCsv(
  detections: OcrDetection[],
  baseFileName: string = 'screenshot'
): void {
  const headers = [
    'ID',
    'Type',
    'Text',
    'Confidence',
    'Pixel_X',
    'Pixel_Y',
    'Pixel_Width',
    'Pixel_Height',
    'Norm_X',
    'Norm_Y',
    'Norm_W',
    'Norm_H',
    'Sensitive_Signal_Type',
    'Sensitive_Pattern'
  ];

  const rows = detections.map((d) => [
    `"${d.id}"`,
    `"${d.type}"`,
    `"${d.text.replace(/"/g, '""')}"`,
    d.confidence,
    d.boundingBox.x,
    d.boundingBox.y,
    d.boundingBox.width,
    d.boundingBox.height,
    d.normalizedBox.normalizedX,
    d.normalizedBox.normalizedY,
    d.normalizedBox.normalizedWidth,
    d.normalizedBox.normalizedHeight,
    `"${d.sensitiveSignal ? d.sensitiveSignal.type : 'none'}"`,
    `"${d.sensitiveSignal ? d.sensitiveSignal.patternName : 'none'}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const cleanFileName = baseFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputName = `privagent-detections-${cleanFileName}.csv`;

  triggerFileDownload(csvContent, outputName, 'text/csv;charset=utf-8');
}
