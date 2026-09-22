import { z } from 'zod';

export const SanitizedElementSchema = z.object({
  id: z.string().min(1, 'Element id cannot be empty'),
  type: z.enum([
    'button',
    'input',
    'select',
    'textarea',
    'link',
    'checkbox',
    'radio',
    'text',
  ]),
  label: z.string().optional(),
  name: z.string().optional(),
  placeholder: z.string().optional(),
  value: z.string().optional(),
  options: z.array(z.string()).optional(),
  disabled: z.boolean().optional(),
  required: z.boolean().optional(),
});

export const PreviousActionExecutionSchema = z.object({
  action: z.record(z.any()),
  status: z.enum(['SUCCESS', 'FAILED']),
  message: z.string().optional(),
});

export const M1PlanRequestSchema = z.object({
  taskId: z.string().optional().default(() => `task-${Date.now()}`),
  instruction: z.string().min(1, 'Instruction cannot be empty'),
  pageContext: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    elements: z.array(SanitizedElementSchema).default([]),
  }),
  previousActions: z.array(PreviousActionExecutionSchema).optional().default([]),
});

export type SanitizedElement = z.infer<typeof SanitizedElementSchema>;
export type PreviousActionExecution = z.infer<typeof PreviousActionExecutionSchema>;
export type M1PlanRequest = z.input<typeof M1PlanRequestSchema>;
export type M1ParsedPlanRequest = z.infer<typeof M1PlanRequestSchema>;
