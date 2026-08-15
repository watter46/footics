import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomEvent, EventMemo, MatchMemo } from '../../schema';
import {
  exportMemosAsJson,
  importMemosBatch,
  importMemosFromJson,
} from '../export';
import { saveCustomEvent } from '../queries';
import { db } from '../schema';

describe('src/lib/db/export', () => {
  beforeEach(async () => {
    await db.event_memos.clear();
    await db.custom_events.clear();
    await db.match_memos.clear();
    vi.restoreAllMocks();
  });

  describe('importMemosBatch', () => {
    it('imports event memos, custom events, and match memos in batch', async () => {
      const memos: EventMemo[] = [
        {
          id: 1,
          matchId: 100,
          period: 1,
          minute: 10,
          second: 0,
          type: 'Save',
          x: 5,
          y: 50,
          memo: 'Good save',
          tags: ['GK'],
          updatedAt: 1000,
        },
      ];
      const customEvents: CustomEvent[] = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          match_id: '100',
          period: 1,
          minute: 10,
          second: 0,
          labels: ['Goal'],
          memo: 'Great finish',
          created_at: 1000,
        },
      ];
      const matchMemos: MatchMemo[] = [
        {
          matchId: '100',
          memo: 'Dominant first half',
          updatedAt: 1000,
        },
      ];

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      await importMemosBatch(memos, customEvents, matchMemos);

      const dbMemos = await db.event_memos.toArray();
      const dbCustomEvents = await db.custom_events.toArray();
      const dbMatchMemos = await db.match_memos.toArray();

      expect(dbMemos).toHaveLength(1);
      expect(dbCustomEvents).toHaveLength(1);
      expect(dbMatchMemos).toHaveLength(1);

      const footicsActions = dispatchSpy.mock.calls
        .map((call) => call[0] as unknown as globalThis.CustomEvent)
        .filter((event) => event.type === 'footics-action');
      expect(footicsActions.length).toBeGreaterThanOrEqual(1);
    });

    it('handles empty batch import gracefully', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      await importMemosBatch([], [], []);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('importMemosFromJson', () => {
    const createMockFile = (content: any, filename = 'memos.json'): File => {
      return new File([JSON.stringify(content)], filename, {
        type: 'application/json',
      });
    };

    it('imports valid custom events from json file', async () => {
      const memosData: CustomEvent[] = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          match_id: '999',
          period: 1,
          minute: 15,
          second: 30,
          labels: ['Pressing'],
          memo: 'High press',
          created_at: 1000,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          match_id: '999',
          period: 2,
          minute: 75,
          second: 0,
          labels: ['Counter'],
          memo: '',
          created_at: 2000,
        },
      ];

      const file = createMockFile(memosData);
      const count = await importMemosFromJson(file, '999');

      expect(count).toBe(2);
      const saved = await db.custom_events.toArray();
      expect(saved).toHaveLength(2);
    });

    it('throws error when json content is not an array', async () => {
      const invalidData = { id: 'single-object' };
      const file = createMockFile(invalidData);

      await expect(importMemosFromJson(file, '999')).rejects.toThrow(
        'Invalid format: expected an array of memos',
      );
    });

    it('throws error when match_id does not match currentMatchId', async () => {
      const mismatchedData = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          match_id: 'other-match',
          period: 1,
          minute: 10,
          second: 0,
          labels: ['Test'],
          memo: '',
          created_at: 1000,
        },
      ];
      const file = createMockFile(mismatchedData);

      await expect(importMemosFromJson(file, '999')).rejects.toThrow(
        /Match ID mismatch/,
      );
    });

    it('throws error when required fields are missing', async () => {
      const missingFieldsData = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          match_id: '999',
          // missing minute and second
        },
      ];
      const file = createMockFile(missingFieldsData);

      await expect(importMemosFromJson(file, '999')).rejects.toThrow(
        'Invalid memo format',
      );
    });
  });

  describe('exportMemosAsJson', () => {
    it('creates a download link with formatted json blob', async () => {
      const customEvent: CustomEvent = {
        id: '11111111-1111-4111-8111-111111111111',
        match_id: 'match-export-1',
        period: 1,
        minute: 20,
        second: 15,
        labels: ['Tackle'],
        memo: '',
        created_at: 1000,
      };
      await saveCustomEvent(customEvent);

      let createdBlob: Blob | null = null;
      let createdUrl = '';

      const createObjectURLMock = vi.fn((blob: Blob) => {
        createdBlob = blob;
        createdUrl = 'blob:http://localhost/test-blob-url';
        return createdUrl;
      });
      const revokeObjectURLMock = vi.fn();

      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      const clickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockImplementation(
        (tagName: string) => {
          if (tagName === 'a') {
            return {
              href: '',
              download: '',
              click: clickSpy,
            } as unknown as HTMLAnchorElement;
          }
          return document.createElement(tagName);
        },
      );

      await exportMemosAsJson('match-export-1');

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(createdBlob).not.toBeNull();
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).toHaveBeenCalledWith(createdUrl);

      // Verify blob content
      if (createdBlob) {
        const text = await (createdBlob as Blob).text();
        const parsed = JSON.parse(text);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].id).toBe('11111111-1111-4111-8111-111111111111');
      }
    });
  });
});
