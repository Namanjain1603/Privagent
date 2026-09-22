import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Header
} from './components/Header';
import { PrivacyBanner } from './components/PrivacyBanner';
import { ImageUploadArea } from './components/ImageUploadArea';
import { ImagePreprocessorControls } from './components/ImagePreprocessorControls';
import { VisualCanvasOverlay } from './components/VisualCanvasOverlay';
import { ExtractedTextPanel } from './components/ExtractedTextPanel';
import { DetectionDetailsPanel } from './components/DetectionDetailsPanel';
import { SummaryStatsBar } from './components/SummaryStatsBar';
import { ExportActionsBar } from './components/ExportActionsBar';
import { OcrProgressModal } from './components/OcrProgressModal';
import { IntegrationContractModal } from './components/IntegrationContractModal';
import { PrivacyModal } from './components/PrivacyModal';

import {
  ImageMetadata,
  OcrDetection,
  OcrProcessingOptions,
  OcrProgressStatus,
  OcrResultBundle
} from './types/privagent';
import { processScreenshot, terminateWorker } from './services/ocrService';
import { SYNTHETIC_PRESETS } from './utils/syntheticTestImages';
import { AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Image State
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null);

  // OCR Configuration Options
  const [ocrOptions, setOcrOptions] = useState<OcrProcessingOptions>({
    language: 'eng',
    granularity: 'lines',
    enhanceContrast: false,
    binarize: false,
    detectSensitiveDemonstration: true,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  });

  // Processing & Results State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<OcrProgressStatus | null>(null);
  const [ocrBundle, setOcrBundle] = useState<OcrResultBundle | null>(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active job token to prevent stale OCR promises from overwriting state after cancellation
  const activeJobIdRef = useRef<number>(0);

  // Modals
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Load a synthetic preset on first mount for instant demonstration
  useEffect(() => {
    // Generate initial synthetic preset for immediate zero-config demonstration
    const defaultPreset = SYNTHETIC_PRESETS[0];
    if (defaultPreset) {
      const canvas = defaultPreset.generate();
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      img.onload = () => {
        setImageElement(img);
        setImageMetadata({
          fileName: `synthetic-${defaultPreset.id}.png`,
          fileSize: Math.round((dataUrl.length * 3) / 4),
          fileType: 'image/png',
          width: canvas.width,
          height: canvas.height,
          aspectRatio: canvas.width / canvas.height,
          devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
          dataUrl
        });
      };
      img.src = dataUrl;
    }

    return () => {
      terminateWorker();
    };
  }, []);

  const handleImageLoaded = useCallback((img: HTMLImageElement, metadata: ImageMetadata) => {
    activeJobIdRef.current++;
    setImageElement(img);
    setImageMetadata(metadata);
    setOcrBundle(null);
    setSelectedDetectionId(null);
    setErrorMessage(null);
  }, []);

  const handleClearImage = useCallback(() => {
    activeJobIdRef.current++;
    setImageElement(null);
    setImageMetadata(null);
    setOcrBundle(null);
    setSelectedDetectionId(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setProgressStatus(null);
  }, []);

  const handleCancelOcr = useCallback(async () => {
    // 1. Invalidate active job so its pending promise can never update state
    activeJobIdRef.current++;
    // 2. Return UI immediately to idle state
    setIsProcessing(false);
    setProgressStatus(null);
    // 3. Terminate the active Web Worker to abort the ongoing background job
    try {
      await terminateWorker();
    } catch {
      // ignore
    }
  }, []);

  const handleRunOcr = useCallback(async () => {
    if (!imageElement || !imageMetadata) {
      setErrorMessage('Please upload a screenshot or select a synthetic preset first.');
      return;
    }

    const currentJobId = ++activeJobIdRef.current;
    setIsProcessing(true);
    setErrorMessage(null);
    setSelectedDetectionId(null);

    const dpr =
      ocrOptions.devicePixelRatio ||
      imageMetadata.devicePixelRatio ||
      (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

    try {
      const bundle = await processScreenshot(
        imageElement,
        {
          fileName: imageMetadata.fileName,
          fileSize: imageMetadata.fileSize,
          fileType: imageMetadata.fileType,
          devicePixelRatio: dpr
        },
        {
          ...ocrOptions,
          devicePixelRatio: dpr
        },
        (progress) => {
          if (activeJobIdRef.current === currentJobId) {
            setProgressStatus(progress);
          }
        }
      );

      // Guard against cancelled or superseded OCR jobs
      if (activeJobIdRef.current !== currentJobId) {
        return;
      }

      setOcrBundle(bundle);
      if (bundle.detections.length > 0) {
        // Auto-select first detection or first sensitive signal if present
        const sensitiveFirst = bundle.detections.find((d) => Boolean(d.sensitiveSignal));
        setSelectedDetectionId(sensitiveFirst ? sensitiveFirst.id : bundle.detections[0].id);
      }
    } catch (err: any) {
      // Suppress errors from cancelled or superseded jobs
      if (activeJobIdRef.current !== currentJobId) {
        return;
      }
      console.error('OCR processing failed locally:', err?.message || err);
      setErrorMessage(
        `Local OCR failed: ${
          err?.message || 'Unable to initialize WebAssembly OCR worker.'
        }. Please check your browser connection for downloading language traineddata or try again.`
      );
    } finally {
      if (activeJobIdRef.current === currentJobId) {
        setIsProcessing(false);
        setProgressStatus(null);
      }
    }
  }, [imageElement, imageMetadata, ocrOptions]);

  const selectedDetection: OcrDetection | null =
    ocrBundle?.detections.find((d) => d.id === selectedDetectionId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Header */}
      <Header
        onOpenIntegrationDoc={() => setIsIntegrationModalOpen(true)}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
      />

      {/* 2. Privacy Assurance Banner */}
      <PrivacyBanner />

      {/* 3. Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Alert Bar */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start justify-between gap-3 shadow-md">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-300">Processing Error: </span>
                {errorMessage}
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Summary Metrics Bar */}
        <SummaryStatsBar bundle={ocrBundle} isProcessing={isProcessing} />

        {/* Input & Preprocessing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Image Upload & Presets (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <ImageUploadArea
              imageMetadata={imageMetadata}
              onImageLoaded={handleImageLoaded}
              onClearImage={handleClearImage}
              isProcessing={isProcessing}
            />

            {/* Visual Canvas Viewer */}
            <VisualCanvasOverlay
              imageUrl={imageMetadata?.dataUrl || null}
              imageWidth={imageMetadata?.width || 800}
              imageHeight={imageMetadata?.height || 600}
              detections={ocrBundle?.detections || []}
              selectedDetectionId={selectedDetectionId}
              onSelectDetection={setSelectedDetectionId}
              showSensitiveSignals={ocrOptions.detectSensitiveDemonstration}
            />
          </div>

          {/* Right Column: Configuration, Inspector, & Extracted Text (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Configuration Controls */}
            <ImagePreprocessorControls
              options={ocrOptions}
              onOptionsChange={setOcrOptions}
              onRunOcr={handleRunOcr}
              isProcessing={isProcessing}
              hasImage={Boolean(imageElement)}
            />

            {/* Active Detection Inspector */}
            {selectedDetection && (
              <DetectionDetailsPanel
                detection={selectedDetection}
                devicePixelRatio={
                  ocrOptions.devicePixelRatio ||
                  imageMetadata?.devicePixelRatio ||
                  (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
                }
                onClose={() => setSelectedDetectionId(null)}
              />
            )}

            {/* Extracted Text Output Panel */}
            <ExtractedTextPanel
              fullText={ocrBundle?.fullText || ''}
              detections={ocrBundle?.detections || []}
              onSelectDetection={setSelectedDetectionId}
              selectedDetectionId={selectedDetectionId}
            />
          </div>
        </div>

        {/* Bottom Export & Reset Action Bar */}
        <ExportActionsBar
          bundle={ocrBundle}
          onReset={handleClearImage}
          isProcessing={isProcessing}
        />
      </main>

      {/* 4. Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">PRIVAGENT</span>
            <span>•</span>
            <span>SIH 2026 Problem Statement SIH26171</span>
            <span>•</span>
            <span className="text-cyan-400">Member 4: OCR &amp; Vision Module</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Zero Server Transmission
            </span>
            <button
              onClick={() => setIsIntegrationModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 underline"
            >
              M1-M6 Contract Docs
            </button>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 underline"
            >
              Privacy Architecture
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <OcrProgressModal status={progressStatus} onCancel={handleCancelOcr} />
      <IntegrationContractModal
        isOpen={isIntegrationModalOpen}
        onClose={() => setIsIntegrationModalOpen(false)}
      />
      <PrivacyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
    </div>
  );
}
