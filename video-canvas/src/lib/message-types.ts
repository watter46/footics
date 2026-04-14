import { z } from 'zod';
import type { CaptureMetadata } from './types';

// メッセージタイプの定数
export const MessageTypes = {
  CAPTURE_TRIGGER: 'VIDEO_CANVAS_CAPTURE_TRIGGER',
  CAPTURE_RESULT: 'VIDEO_CANVAS_CAPTURE_RESULT',
  REQUEST_TAB_CAPTURE: 'VIDEO_CANVAS_REQUEST_TAB_CAPTURE',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];

// キャプチャメタデータのスキーマ (types.ts の構造に合わせる)
export const CaptureMetadataSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  devicePixelRatio: z.number(),
  videoWidth: z.number().optional(),
  videoHeight: z.number().optional(),
  viewportWidth: z.number().optional(),
  viewportHeight: z.number().optional(),
  originalVideoRect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
}) as z.ZodType<CaptureMetadata>;

// メッセージのスキーマ
export const CaptureTriggerMessageSchema = z.object({
  type: z.literal(MessageTypes.CAPTURE_TRIGGER),
});

export const RequestTabCaptureMessageSchema = z.object({
  type: z.literal(MessageTypes.REQUEST_TAB_CAPTURE),
});

export const CaptureResultMessageSchema = z.object({
  type: z.literal(MessageTypes.CAPTURE_RESULT),
  dataUrl: z.string(),
  rect: CaptureMetadataSchema.optional(),
  isDirectCapture: z.boolean(),
});

export const AnyMessageSchema = z.discriminatedUnion('type', [
  CaptureTriggerMessageSchema,
  RequestTabCaptureMessageSchema,
  CaptureResultMessageSchema,
]);

// Zodから型を抽出
export type CaptureTriggerMessage = z.infer<typeof CaptureTriggerMessageSchema>;
export type RequestTabCaptureMessage = z.infer<typeof RequestTabCaptureMessageSchema>;
export type CaptureResultMessage = z.infer<typeof CaptureResultMessageSchema>;
export type ExtensionMessage = z.infer<typeof AnyMessageSchema>;
