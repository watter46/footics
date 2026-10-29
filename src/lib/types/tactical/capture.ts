// ─────────────────────────────────────────
// § 16. Capture Protocol Contracts (Web <-> Extension)
// ─────────────────────────────────────────

export {
  createTacticalCapturePayload,
  type FooticsRequestPendingCaptureMessage,
  FooticsRequestPendingCaptureMessageSchema,
  type FooticsTacticalCaptureMessage,
  FooticsTacticalCaptureMessageSchema,
  isTacticalCapturePayload,
  type RequestTabCaptureResponse,
  RequestTabCaptureResponseSchema,
  type SendCaptureToTacticalRequest,
  SendCaptureToTacticalRequestSchema,
  type SendCaptureToTacticalResponse,
  SendCaptureToTacticalResponseSchema,
  safeParseTacticalCapturePayload,
  TACTICAL_BRIDGE_CHANNEL,
  TACTICAL_BRIDGE_MESSAGE_TYPES,
  TACTICAL_CAPTURE_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE,
  TACTICAL_CAPTURE_WINDOW_MESSAGE,
  TACTICAL_STORAGE_KEYS,
  type TacticalBroadcastMessage,
  TacticalBroadcastMessageSchema,
  type TacticalCaptureEventPayload,
  TacticalCaptureEventPayloadSchema,
  type TacticalCapturePayload,
  TacticalCapturePayloadSchema,
  validateTacticalCapturePayload,
} from '../capture-protocol';
