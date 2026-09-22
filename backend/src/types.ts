export interface ObservabilityMetrics {
  total_requests: number;
  success_requests: number;
  failed_requests: number;
  average_latency_ms: number;
  client_rejection_count: number;
  server_error_count: number;
}

export interface SessionStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
}

export interface SecurityStats {
  total_audit_events: number;
  unsafe_actions_blocked: number;
  zero_leak_guarantee: boolean;
}

export interface SystemStatus {
  status: string;
  service: string;
  demo_mode: boolean;
  database: string;
  environment: string;
}

export interface ActionItem {
  type: 'CLICK' | 'TYPE' | 'SELECT' | 'SCROLL' | 'NAVIGATE';
  target: string;
  value?: string;
  description?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SECURITY' | 'REJECTED' | 'SUCCESS';
  endpoint: string;
  message: string;
  data?: any;
}
