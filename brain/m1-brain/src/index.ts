import express from 'express';
import { config } from './config/env.js';
import { M1PlanRequestSchema } from './schemas/input.schema.js';
import { planActions } from './core/planner.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  // Health and capability probe
  app.get('/api/m1/health', (_req, res) => {
    res.json({
      status: 'HEALTHY',
      module: 'M1 — AI Agent Brain',
      version: '0.1.0',
      geminiConfigured: !!config.geminiApiKey,
      allowedActions: ['CLICK', 'TYPE', 'SELECT', 'SCROLL', 'NAVIGATE'],
    });
  });

  // Core M1 Planning Endpoint
  app.post('/api/m1/plan', async (req, res) => {
    try {
      const parseResult = M1PlanRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({
          status: 'FAILED',
          code: 'MISSING_USER_INPUT',
          message: 'Invalid M1 plan request payload format.',
          details: {
            suggestedClarification: parseResult.error.errors
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join('; '),
          },
          actions: [],
        });
      }

      const plan = await planActions(parseResult.data);
      return res.status(200).json(plan);
    } catch (error: any) {
      console.error('[M1 API Error]', error);
      return res.status(500).json({
        status: 'FAILED',
        code: 'UNSUPPORTED_ACTION',
        message: `Internal M1 planning server error: ${error?.message || 'Unknown error'}`,
        actions: [],
      });
    }
  });

  return app;
}

// Auto-start server if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[M1 AI Agent Brain] Server listening on http://0.0.0.0:${config.port}`);
    console.log(`[M1 AI Agent Brain] Gemini API Key present: ${!!config.geminiApiKey}`);
  });
}
