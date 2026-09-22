import { z } from 'zod';
import { M1ActionSchema } from './action.schema.js';

export const M1FailureCodes = [
  'ELEMENT_NOT_FOUND',
  'AMBIGUOUS_TARGET',
  'MISSING_USER_INPUT',
  'UNSUPPORTED_ACTION',
  'SENSITIVE_DATA_REQUESTED',
  'TASK_COMPLETE',
] as const;

export type M1FailureCode = typeof M1FailureCodes[number];

export const M1ReasoningSchema = z.object({
  intent: z.string().describe('Identified user intent or primary goal'),
  subGoals: z.array(z.string()).describe('Step-by-step decomposed logical tasks'),
  contextSummary: z.string().describe('Observations about the current sanitized DOM and matchability'),
});

export const M1PlanSuccessResponseSchema = z.object({
  status: z.literal('SUCCESS'),
  code: z.literal('TASK_COMPLETE').optional(),
  message: z.string().optional(),
  reasoning: M1ReasoningSchema.optional(),
  actions: z.array(M1ActionSchema),
});

export const M1PlanFailureResponseSchema = z.object({
  status: z.enum(['FAILED', 'NEEDS_CLARIFICATION']),
  code: z.enum(M1FailureCodes),
  message: z.string(),
  details: z
    .object({
      missingTargetDescription: z.string().optional(),
      suggestedClarification: z.string().optional(),
    })
    .optional(),
  actions: z.array(z.never()).default([]),
});

export const M1PlanResponseSchema = z.union([
  M1PlanSuccessResponseSchema,
  M1PlanFailureResponseSchema,
]);

export type M1Reasoning = z.infer<typeof M1ReasoningSchema>;
export type M1PlanSuccessResponse = z.infer<typeof M1PlanSuccessResponseSchema>;
export type M1PlanFailureResponse = z.infer<typeof M1PlanFailureResponseSchema>;
export type M1PlanResponse = z.infer<typeof M1PlanResponseSchema>;
