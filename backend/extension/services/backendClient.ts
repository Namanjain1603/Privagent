/**
 * PRIVAGENT Chrome Extension Backend Client (M3 <-> M5)
 * SIH 2026 Problem Statement: SIH26171
 */

export interface PageElement {
  id?: string;
  tag?: string;
  type?: string;
  selector?: string;
  text_content?: string;
  label?: string;
  role?: string;
  is_interactive?: boolean;
}

export interface SanitizedContext {
  page_title?: string;
  page_url?: string;
  elements: PageElement[];
  redaction_verified: boolean;
  redacted_token_count: number;
}

export interface BrowserAction {
  type: 'CLICK' | 'TYPE' | 'SELECT' | 'SCROLL' | 'NAVIGATE';
  target: string;
  value?: string;
  description?: string;
}

export interface ActionPlan {
  plan_id: string;
  session_id: string;
  actions: BrowserAction[];
  total_actions: number;
  confidence: number;
  reasoning_summary?: string;
}

export class PrivagentBackendClient {
  private baseUrl: string;
  private currentSessionId: string | null = null;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getSessionId(): string | null {
    return this.currentSessionId;
  }

  public async checkHealth(): Promise<{ status: string; demo_mode: boolean }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return await res.json();
  }

  public async createSession(userTask: string, customSessionId?: string): Promise<{ session_id: string; status: string }> {
    const res = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: customSessionId,
        user_task: userTask
      })
    });
    if (!res.ok) throw new Error(`Session creation failed: ${res.status}`);
    const data = await res.json();
    this.currentSessionId = data.session_id;
    return data;
  }

  public async sendSanitizedContext(url: string, title: string, context: SanitizedContext) {
    if (!this.currentSessionId) throw new Error('No active session.');
    const res = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.currentSessionId,
        url,
        page_title: title,
        sanitized_context: context
      })
    });
    if (!res.ok) throw new Error(`Analyze context failed: ${res.status}`);
    return await res.json();
  }

  public async requestActionPlan(userGoal: string, currentUrl: string, elements: PageElement[]): Promise<ActionPlan> {
    if (!this.currentSessionId) throw new Error('No active session.');
    const res = await fetch(`${this.baseUrl}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.currentSessionId,
        user_goal: userGoal,
        current_url: currentUrl,
        sanitized_elements: elements
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Plan generation failed: ${err?.detail || res.status}`);
    }
    const data = await res.json();
    return data.action_plan;
  }

  public async validateActionPreflight(action: BrowserAction): Promise<{ is_safe: boolean; rejection_reason?: string }> {
    if (!this.currentSessionId) throw new Error('No active session.');
    const res = await fetch(`${this.baseUrl}/validate-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: this.currentSessionId,
        action
      })
    });
    if (!res.ok) throw new Error(`Action preflight failed: ${res.status}`);
    return await res.json();
  }

  public async postTelemetry(
    eventType: string,
    actionType?: string,
    executionTimeMs: number = 0,
    success: boolean = true,
    details: Record<string, any> = {}
  ) {
    if (!this.currentSessionId) return;
    try {
      await fetch(`${this.baseUrl}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.currentSessionId,
          event_type: eventType,
          component: 'CHROME_EXTENSION',
          action_type: actionType,
          execution_time_ms: executionTimeMs,
          success,
          details
        })
      });
    } catch (e) {
      console.warn('Telemetry post failed silently:', e);
    }
  }

  public async completeSession() {
    if (!this.currentSessionId) return;
    await fetch(`${this.baseUrl}/session/${this.currentSessionId}/complete`, { method: 'PATCH' });
    this.currentSessionId = null;
  }
}
