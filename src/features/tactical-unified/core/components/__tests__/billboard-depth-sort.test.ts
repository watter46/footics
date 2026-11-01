import { describe, expect, it } from 'vitest';
import type { PitchRectBounds } from '../../utils/canvas-coordinates';
import {
  type BillboardItem,
  sortBillboardItemsByDepth,
} from '../billboard-depth-sort';

const mockPitchRect: PitchRectBounds = {
  x: 0,
  y: 0,
  width: 1000,
  height: 600,
};

describe('sortBillboardItemsByDepth', () => {
  it('should sort items back-to-front (smaller Y to larger Y) when none are selected', () => {
    const itemA = { id: 'item-a', x: 50, y: 80 }; // 手前
    const itemB = { id: 'item-b', x: 50, y: 20 }; // 奥

    const sorted = sortBillboardItemsByDepth([itemA, itemB], mockPitchRect);
    expect(sorted).toEqual([itemB, itemA]);
  });

  it('should move selected item to the end (top) even if its Y is smaller (deeper)', () => {
    const itemA = { id: 'item-a', x: 50, y: 80 }; // 手前 (非選択)
    const itemB = { id: 'item-b', x: 50, y: 20 }; // 奥 (選択中)

    const sorted = sortBillboardItemsByDepth(
      [itemA, itemB],
      mockPitchRect,
      undefined,
      ['item-b'],
    );
    expect(sorted).toEqual([itemA, itemB]);
  });

  it('should support BillboardItem format with data.id', () => {
    const itemA = {
      kind: 'player' as const,
      data: { id: 'player-a' } as any,
      x: 50,
      y: 80,
    };
    const itemB = {
      kind: 'player' as const,
      data: { id: 'player-b' } as any,
      x: 50,
      y: 20,
    };

    const sorted = sortBillboardItemsByDepth(
      [itemA, itemB],
      mockPitchRect,
      undefined,
      ['player-b'],
    );
    expect(sorted).toEqual([itemA, itemB]);
  });

  it('should sort by Y coordinate when both items are selected or both unselected', () => {
    const itemA = { id: 'item-a', x: 50, y: 80 };
    const itemB = { id: 'item-b', x: 50, y: 20 };

    // Both selected
    const sortedBothSelected = sortBillboardItemsByDepth(
      [itemA, itemB],
      mockPitchRect,
      undefined,
      ['item-a', 'item-b'],
    );
    expect(sortedBothSelected).toEqual([itemB, itemA]);

    // Both unselected (selectedIds has unrelated id)
    const sortedBothUnselected = sortBillboardItemsByDepth(
      [itemA, itemB],
      mockPitchRect,
      undefined,
      ['other-id'],
    );
    expect(sortedBothUnselected).toEqual([itemB, itemA]);
  });
});
