export type PrivacyStatus = 'PROTECTED' | 'AT_RISK' | 'INTERCEPTED' | 'BYPASSED';
export type SessionStatus = 'ACTIVE' | 'IDLE' | 'COMPLETED' | 'TERMINATED' | 'FAILED';

export type AllowedActionType = 'CLICK' | 'TYPE' | 'SELECT' | 'SCROLL' | 'NAVIGATE';

export interface PiiEntity {
  id: string;
  type: 'AADHAAR' | 'PAN' | 'PHONE' | 'EMAIL' | 'PASSWORD' | 'BANK_ACCOUNT' | 'NAME' | 'GENERIC_PII';
  rawMasked: string; // Synthetic or masked representation like XXXX-XXXX-4589
  source: 'DOM_TEXT' | 'INPUT_FIELD' | 'OCR_SCREENSHOT' | 'CANVAS';
  confidence: number;
  redacted: boolean;
  redactionMethod: 'MASK' | 'SYNTHETIC_REPLACE' | 'OMIT';
  originalValueStatus?: string; // e.g. "INTERCEPTED_LOCAL" | "SUPPRESSED_AT_DOM"
  cloudSent?: string; // e.g. "0 Bytes (Blocked)" | "Token Only"
  targetSelector?: string;
  timestamp: string;
}

export interface BrowserActionLog {
  id: string;
  stepNumber: number;
  action: AllowedActionType;
  selector: string;
  sanitizedValue?: string;
  timestamp: string;
  validated: boolean;
  validationError?: string;
  durationMs: number;
}

export interface ActionValidationReport {
  id: string;
  payload: Record<string, any>;
  status: 'ALLOWED' | 'BLOCKED';
  actionType: string;
  reason: string;
  timestamp: string;
  threatLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ActionValidatorSummary {
  totalChecked: number;
  allowedCount: number;
  blockedCount: number;
  validationErrorsCount: number;
}

export interface LatencyBreakdown {
  domCaptureMs: number;
  ocrVisionMs: number;
  piiDetectionMs: number;
  localRedactionMs: number;
  backendNetworkMs: number;
  cloudReasoningMs: number;
  actionValidationMs: number;
  browserExecutionMs: number;
  totalEndToEndMs: number;
}

export interface ClientResourceUsage {
  cpuUsagePct: number;
  memoryUsageMb: number;
  gpuActive: boolean;
  modelVramMb?: number;
}

export interface BenchmarkMetrics {
  isSimulated: boolean;
  datasetName: string;
  samplesTested: number;
  piiPrecision: number;
  piiRecall: number;
  f1Score: number;
  redactionPrecision: number;
  rawPiiLeakCount: number;
  avgLatencyMs: number;
}

export interface TestCase {
  id: string;
  title: string;
  objective: string;
  category: 'CORE_PII' | 'EDGE_CASE' | 'SECURITY' | 'INFRA_FAILURE';
  preconditions: string;
  steps: string[];
  expectedResult: string;
  actualResult: string;
  status: 'PASS' | 'FAIL' | 'PENDING' | 'RUNNING';
  notes: string;
  syntheticPayloadPreview?: string;
}

export interface PrivacyTestCase {
  id: string;
  name: string;
  piiType: string;
  sampleContent: string;
  expectedResult: string;
  actualResult: string;
  status: 'PASS' | 'FAIL';
  notes: string;
  category: 'CORE_PII' | 'EDGE_CASE' | 'ERROR_HANDLING' | 'ACTION_GUARD' | 'RESILIENCE';
  detectedCount: number;
  redactedCount: number;
  rawLeakCount: number;
  details?: {
    detectionMethod: string;
    redactionMask: string;
    falsePositiveCheck: string;
    latencyBudgetMs: number;
  };
}

export interface PrivacyBenchmarkMetrics {
  piiPrecision: number;
  piiRecall: number;
  f1Score: number;
  redactionPrecision: number;
  falsePositives: number;
  falseNegatives: number;
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  passRate: number;
  isSimulated: boolean;
}

export interface IntegrationServiceHealth {
  id: string;
  name: string;
  component: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'PASS' | 'FAIL' | 'WARNING';
  latencyMs?: number;
  lastChecked: string;
  notes: string;
  isSimulated: boolean;
}

export interface FailureScenarioTest {
  id: string;
  title: string;
  scenarioType:
    | 'BACKEND_UNAVAILABLE'
    | 'MALFORMED_API_RESPONSE'
    | 'INVALID_ACTION_PAYLOAD'
    | 'UNKNOWN_BROWSER_ACTION'
    | 'PII_DETECTION_FAILURE'
    | 'REDACTION_FAILURE'
    | 'EMPTY_RESPONSE'
    | 'NETWORK_TIMEOUT';
  triggerDescription: string;
  expectedHandling: string;
  actualStatus: 'PASS' | 'FAIL';
  systemResponse: string;
  safetyGuarantee: string;
}

export interface TelemetryPayload {
  sessionId: string;
  timestamp: string;
  url: string;
  pageTitle: string;
  privacyStatus: PrivacyStatus;
  piiDetectedCount: number;
  piiRedactedCount: number;
  rawPiiSentToCloud: number;
  currentSessionStatus: SessionStatus;
  recentActions: BrowserActionLog[];
  detectedPiiList: PiiEntity[];
  latency: LatencyBreakdown;
  clientResources: ClientResourceUsage;
  isSimulatedDemoData: boolean;
}
