/**
 * capture-protocol.test.ts
 * Contract & Schema validation tests for Capture Protocol
 */

import { describe, expect, it } from 'vitest';
import {
  createTacticalCapturePayload,
  FooticsRequestPendingCaptureMessageSchema,
  FooticsTacticalCaptureMessageSchema,
  isTacticalCapturePayload,
  RequestTabCaptureResponseSchema,
  SendCaptureToTacticalRequestSchema,
  SendCaptureToTacticalResponseSchema,
  safeParseTacticalCapturePayload,
  TACTICAL_BRIDGE_CHANNEL,
  TACTICAL_CAPTURE_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE,
  TACTICAL_CAPTURE_WINDOW_MESSAGE,
  TacticalBroadcastMessageSchema,
  TacticalCapturePayloadSchema,
  validateTacticalCapturePayload,
} from '../capture-protocol';
import {
  TacticalCapturePayloadSchema as ReExportedSchema,
  createTacticalCapturePayload as reExportedCreate,
  isTacticalCapturePayload as reExportedIs,
} from '../tactical-unified';

describe('Capture Protocol Constants', () => {
  it('defines stable channel and event identifiers', () => {
    expect(TACTICAL_BRIDGE_CHANNEL).toBe('footics-tactical-bridge');
    expect(TACTICAL_CAPTURE_WINDOW_MESSAGE).toBe(
      'FOOTICS_TACTICAL_CAPTURE_PAYLOAD',
    );
    expect(TACTICAL_CAPTURE_CUSTOM_EVENT).toBe(
      'footics-tactical-capture-received',
    );
    expect(TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE).toBe(
      'FOOTICS_REQUEST_PENDING_CAPTURE',
    );
    expect(TACTICAL_CAPTURE_PULL_CUSTOM_EVENT).toBe(
      'footics-request-pending-capture',
    );
  });
});

describe('TacticalCapturePayloadSchema', () => {
  const validPayload = {
    id: 'capture_1725331234_abc123',
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
    timestamp: 1725331234000,
    sourceUrl: 'https://youtube.com/watch?v=mock',
    title: 'Chelsea vs Arsenal Tactical Clip',
  };

  it('validates a correct payload successfully', () => {
    const result = TacticalCapturePayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validPayload);
    }
  });

  it('allows optional fields to be omitted', () => {
    const minimal = {
      id: 'capture_123',
      dataUrl: 'data:image/png;base64,...',
      timestamp: 123456789,
    };
    const result = TacticalCapturePayloadSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('rejects payload missing required fields', () => {
    expect(TacticalCapturePayloadSchema.safeParse({}).success).toBe(false);
    expect(
      TacticalCapturePayloadSchema.safeParse({
        id: '',
        dataUrl: 'data:image/png;base64,...',
        timestamp: 123,
      }).success,
    ).toBe(false);
    expect(
      TacticalCapturePayloadSchema.safeParse({
        id: '123',
        dataUrl: '',
        timestamp: 123,
      }).success,
    ).toBe(false);
    expect(
      TacticalCapturePayloadSchema.safeParse({
        id: '123',
        dataUrl: 'data:image/png;base64,...',
        timestamp: -1,
      }).success,
    ).toBe(false);
  });
});

describe('Message & Request / Response Schemas', () => {
  const validPayload = {
    id: 'cap_1',
    dataUrl: 'data:image/png;base64,test',
    timestamp: 1000,
  };

  it('SendCaptureToTacticalRequestSchema validates payload wrapper', () => {
    expect(
      SendCaptureToTacticalRequestSchema.safeParse({ payload: validPayload })
        .success,
    ).toBe(true);
  });

  it('SendCaptureToTacticalResponseSchema validates response shape', () => {
    expect(
      SendCaptureToTacticalResponseSchema.safeParse({
        success: true,
        tabId: 42,
        created: false,
      }).success,
    ).toBe(true);

    expect(
      SendCaptureToTacticalResponseSchema.safeParse({
        success: false,
        error: 'Tab not found',
      }).success,
    ).toBe(true);
  });

  it('RequestTabCaptureResponseSchema validates tab capture result', () => {
    expect(
      RequestTabCaptureResponseSchema.safeParse({
        success: true,
        dataUrl: 'data:image/jpeg;base64,...',
      }).success,
    ).toBe(true);
  });

  it('FooticsTacticalCaptureMessageSchema validates window message', () => {
    expect(
      FooticsTacticalCaptureMessageSchema.safeParse({
        type: 'FOOTICS_TACTICAL_CAPTURE_PAYLOAD',
        payload: validPayload,
      }).success,
    ).toBe(true);

    expect(
      FooticsTacticalCaptureMessageSchema.safeParse({
        type: 'UNKNOWN_TYPE',
        payload: validPayload,
      }).success,
    ).toBe(false);
  });

  it('FooticsRequestPendingCaptureMessageSchema validates pull request', () => {
    expect(
      FooticsRequestPendingCaptureMessageSchema.safeParse({
        type: 'FOOTICS_REQUEST_PENDING_CAPTURE',
      }).success,
    ).toBe(true);
  });

  it('TacticalBroadcastMessageSchema validates broadcast channel format', () => {
    expect(
      TacticalBroadcastMessageSchema.safeParse({
        type: 'TACTICAL_CAPTURE_RECEIVED',
        payload: validPayload,
      }).success,
    ).toBe(true);
  });
});

describe('Validation & Generation Helpers', () => {
  const valid = {
    id: 'cap_val',
    dataUrl: 'data:image/png;base64,xyz',
    timestamp: 12345,
  };

  it('isTacticalCapturePayload type guard works', () => {
    expect(isTacticalCapturePayload(valid)).toBe(true);
    expect(isTacticalCapturePayload({ invalid: true })).toBe(false);
    expect(isTacticalCapturePayload(null)).toBe(false);
  });

  it('safeParseTacticalCapturePayload returns valid parse result', () => {
    const res1 = safeParseTacticalCapturePayload(valid);
    expect(res1.success).toBe(true);
    const res2 = safeParseTacticalCapturePayload('invalid');
    expect(res2.success).toBe(false);
  });

  it('validateTacticalCapturePayload returns typed data or null', () => {
    expect(validateTacticalCapturePayload(valid)).toEqual(valid);
    expect(validateTacticalCapturePayload(null)).toBeNull();
    expect(validateTacticalCapturePayload({ id: 123 })).toBeNull();
  });

  it('createTacticalCapturePayload generates valid payload with unique id and timestamp', () => {
    const payload = createTacticalCapturePayload(
      'data:image/png;base64,generated',
      {
        sourceUrl: 'https://example.com/video',
        title: 'Tactical Clip',
      },
    );

    expect(payload.id).toMatch(/^capture_\d+_[a-z0-9]+$/);
    expect(payload.dataUrl).toBe('data:image/png;base64,generated');
    expect(payload.sourceUrl).toBe('https://example.com/video');
    expect(payload.title).toBe('Tactical Clip');
    expect(payload.timestamp).toBeGreaterThan(0);
    expect(isTacticalCapturePayload(payload)).toBe(true);
  });
});

describe('Re-exports from tactical-unified', () => {
  it('tactical-unified re-exports capture protocol schemas and utilities identically', () => {
    expect(ReExportedSchema).toBe(TacticalCapturePayloadSchema);
    expect(reExportedCreate).toBe(createTacticalCapturePayload);
    expect(reExportedIs).toBe(isTacticalCapturePayload);
  });
});
