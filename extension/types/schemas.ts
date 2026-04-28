import { z } from 'zod';

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

export const ExtensionMessageSchema = z.discriminatedUnion('type', [
  OpenOverlaySchema,
  GetActiveMatchInfoSchema,
  CloseSidepanelSchema,
  FooticsActionSchema,
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

/**
 * Save Queue Schemas (Phase 2: Storage-Driven Sync)
 *
 * Overlay は直接 BG への sendMessage をせず、
 * chrome.storage.local のキューにデータを積む。
 * Content Script が storage.onChanged でキューを監視し、処理する。
 */
export const SaveQueueItemSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'done', 'error']),
  mode: MemoModeSchema,
  matchId: z.string(),
  memo: z.string(),
  minute: z.number().int().optional(),
  second: z.number().int().optional(),
  labels: z.array(z.string()).optional(),
  createdAt: z.number(),
});

export const SaveQueueSchema = z.array(SaveQueueItemSchema);

export type SaveQueueItem = z.infer<typeof SaveQueueItemSchema>;
export type SaveQueue = z.infer<typeof SaveQueueSchema>;
