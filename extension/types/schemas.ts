import { z } from 'zod';
import { CustomEventSchema } from '@/lib/schema';

/**
 * MemoMode Schema
 */
export const MemoModeSchema = z.enum(['MATCH', 'EVENT']);

/**
 * Extension Message Schemas (Discriminated Union)
 */

export const OpenOverlaySchema = z.object({
  type: z.literal('OPEN_OVERLAY'),
  mode: MemoModeSchema,
  matchId: z.string().optional(),
  error: z.string().optional(),
});

export const GetActiveMatchInfoSchema = z.object({
  type: z.literal('GET_ACTIVE_MATCH_INFO'),
});

export const CloseSidepanelSchema = z.object({
  type: z.literal('CLOSE_SIDEPANEL'),
});

export const FooticsActionSchema = z.object({
  type: z.literal('footics-action'),
  detail: z.object({
    action: z.string(),
    key: z.string().optional(),
    code: z.string().optional(),
    shiftKey: z.boolean().optional(),
    ctrlKey: z.boolean().optional(),
    metaKey: z.boolean().optional(),
    categoryIndex: z.number().optional(),
  }),
});

export const SaveMemoRelaySchema = z.object({
  type: z.literal('SAVE_MEMO_RELAY'),
  mode: MemoModeSchema,
  matchId: z.string(),
  memo: z.string(),
  minute: z.number().int().optional(),
  second: z.number().int().optional(),
  labels: z.array(z.string()).optional(),
});

export const SaveCustomEventSchema = z.object({
  type: z.literal('SAVE_CUSTOM_EVENT'),
  event: CustomEventSchema,
});

export const ExtensionMessageSchema = z.discriminatedUnion('type', [
  OpenOverlaySchema,
  GetActiveMatchInfoSchema,
  CloseSidepanelSchema,
  FooticsActionSchema,
  SaveMemoRelaySchema,
  SaveCustomEventSchema,
]);

/**
 * Response Schemas
 */

export const SaveMemoResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export const MatchInfoResponseSchema = z.object({
  matchId: z.string().optional(),
  memo: z.string().optional(),
});

/**
 * Inferred Types
 */
export type ExtensionMessage = z.infer<typeof ExtensionMessageSchema>;
export type SaveMemoResponse = z.infer<typeof SaveMemoResponseSchema>;
export type MatchInfoResponse = z.infer<typeof MatchInfoResponseSchema>;
export type MemoMode = z.infer<typeof MemoModeSchema>;
