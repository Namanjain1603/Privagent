import { configureOcrAssets, processScreenshot } from '../../../ocr/src/services/ocrService';
import { analyzeImage } from './vision/vitVisionService';

// Configure asset paths using chrome.runtime.getURL
configureOcrAssets({
  workerPath: chrome.runtime.getURL('assets/tesseract/worker.min.js'),
  corePath: chrome.runtime.getURL('assets/tesseract/tesseract-core.wasm.js'),
  langPath: chrome.runtime.getURL('assets/tesseract/'), // tesseract.js appends eng.traineddata.gz
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OCR_REQUEST') {
    handleOcrRequest(message.dataUrl, message.viewport).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // Keep the message channel open for async response
  }
});

async function handleOcrRequest(dataUrl: string, viewport: { width: number, height: number, dpr: number }) {
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    const metadata = {
      fileName: 'screenshot.png',
      fileSize: 0,
      fileType: 'image/png',
      devicePixelRatio: viewport.dpr
    };

    const options = {
      language: 'eng',
      granularity: 'lines' as const,
      enhanceContrast: false,
      binarize: false,
      detectSensitiveDemonstration: true,
      devicePixelRatio: viewport.dpr
    };

    const [ocrResult, vitResult] = await Promise.all([
      processScreenshot(img, metadata, options),
      analyzeImage(dataUrl).catch(e => ({
        enabled: true,
        available: false,
        degraded: true,
        reason: e.message || 'VIT_ANALYSIS_FAILED',
        model: 'vit-tiny-patch16-224',
        runtime: 'none' as const,
        inferenceMs: 0,
        predictions: []
      }))
    ]);
    
    // Return both M4 detections and M2B visual perception
    return { 
      detections: ocrResult.detections,
      imageDimensions: ocrResult.imageDimensions,
      viewportDimensions: ocrResult.viewportDimensions,
      visualPerception: vitResult
    };
  } catch (error: any) {
    return { error: error.message };
  }
}
