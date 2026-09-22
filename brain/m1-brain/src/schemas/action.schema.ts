import { z } from 'zod';

export const MVP_ACTION_TYPES = ['CLICK', 'TYPE', 'SELECT', 'SCROLL', 'NAVIGATE'] as const;
export type MVPActionType = typeof MVP_ACTION_TYPES[number];

export const ClickActionSchema = z.object({
  type: z.literal('CLICK'),
  target: z.string().min(1, 'Target element ID is required for CLICK'),
  description: z.string().optional(),
});

export const TypeActionSchema = z.object({
  type: z.literal('TYPE'),
  target: z.string().min(1, 'Target element ID is required for TYPE'),
  value: z.string(),
  description: z.string().optional(),
});

export const SelectActionSchema = z.object({
  type: z.literal('SELECT'),
  target: z.string().min(1, 'Target element ID is required for SELECT'),
  value: z.string().min(1, 'Selected value is required for SELECT'),
  description: z.string().optional(),
});

export const ScrollActionSchema = z.object({
  type: z.literal('SCROLL'),
  direction: z.enum(['UP', 'DOWN', 'TOP', 'BOTTOM']),
  target: z.string().optional(),
  description: z.string().optional(),
});

export const NavigateActionSchema = z.object({
  type: z.literal('NAVIGATE'),
  url: z.string().url('Must be a valid explicit URL (e.g., https://example.com)'),
  description: z.string().optional(),
});

export const M1ActionSchema = z.discriminatedUnion('type', [
  ClickActionSchema,
  TypeActionSchema,
  SelectActionSchema,
  ScrollActionSchema,
  NavigateActionSchema,
]);

export type ClickAction = z.infer<typeof ClickActionSchema>;
export type TypeAction = z.infer<typeof TypeActionSchema>;
export type SelectAction = z.infer<typeof SelectActionSchema>;
export type ScrollAction = z.infer<typeof ScrollActionSchema>;
export type NavigateAction = z.infer<typeof NavigateActionSchema>;
export type M1Action = z.infer<typeof M1ActionSchema>;
