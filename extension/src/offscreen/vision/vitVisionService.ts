import { pipeline, env } from '@huggingface/transformers';
import { VitResult } from './vitVisionTypes';

// Safeguard: Strict local offline inference only
env.allowRemoteModels = false;
env.allowLocalModels = true;
// Webpack copies assets to dist/assets/models. 
// We use chrome.runtime.getURL to resolve the absolute URL for the offscreen document.
env.localModelPath = chrome.runtime.getURL('assets/models/');

let vitPipeline: any = null;
let initPromise: Promise<any> | null = null;
let currentRuntime: 'webgpu' | 'wasm' | 'none' = 'none';
let loadError: string | null = null;

export async function initializeVitModel() {
  if (vitPipeline) return vitPipeline;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      try {
        vitPipeline = await pipeline('image-classification', 'vit-tiny-patch16-224-ONNX', {
          device: 'webgpu',
          dtype: 'q8'
        });
        currentRuntime = 'webgpu';
      } catch (e: any) {
        console.warn('WebGPU initialization failed, falling back to WASM/CPU:', e.message);
        try {
            vitPipeline = await pipeline('image-classification', 'vit-tiny-patch16-224-ONNX', {
              device: 'wasm',
              dtype: 'q8'
            });
            currentRuntime = 'wasm';
        } catch (wasmError: any) {
            console.warn('WASM initialization failed, falling back to CPU:', wasmError.message);
            vitPipeline = await pipeline('image-classification', 'vit-tiny-patch16-224-ONNX', {
              device: 'cpu',
              dtype: 'q8'
            });
            currentRuntime = 'wasm'; // Record as WASM/CPU degraded mode
        }
      }
      return vitPipeline;
    } catch (error: any) {
      loadError = error.message;
      currentRuntime = 'none';
      vitPipeline = null;
      throw error;
    }
  })();

  return initPromise;
}

export async function analyzeImage(dataUrl: string): Promise<VitResult> {
  try {
    const pipe = await initializeVitModel();
    const start = performance.now();
    const results = await pipe(dataUrl);
    const inferenceMs = performance.now() - start;

    return {
      enabled: true,
      available: true,
      degraded: false,
      model: "vit-tiny-patch16-224",
      runtime: currentRuntime,
      inferenceMs,
      predictions: results.map((r: any) => ({
        label: r.label,
        score: r.score
      }))
    };
  } catch (error: any) {
    // Safeguard 9: Do not fabricate successful results on failure.
    return {
      enabled: true,
      available: false,
      degraded: true,
      reason: loadError || error.message || 'MODEL_LOAD_FAILED',
      model: "vit-tiny-patch16-224",
      runtime: currentRuntime,
      inferenceMs: 0,
      predictions: []
    };
  }
}
