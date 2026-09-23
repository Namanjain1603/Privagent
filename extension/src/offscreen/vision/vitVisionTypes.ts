export interface VitPrediction {
  label: string;
  score: number;
}

export interface VitResult {
  enabled: boolean;
  available: boolean;
  degraded: boolean;
  reason?: string;
  model: string;
  runtime: 'webgpu' | 'wasm' | 'none';
  inferenceMs: number;
  predictions: VitPrediction[];
}
