import { configureOcrAssets, processScreenshot } from '../../../ocr/src/services/ocrService';

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

    const result = await processScreenshot(img, metadata, options);
    
    // We only need to return the detections
    return { 
      detections: result.detections, 
      imageDimensions: result.imageDimensions, 
      viewportDimensions: result.viewportDimensions 
    };
  } catch (error: any) {
    return { error: error.message };
  }
}
