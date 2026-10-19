import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoOverlayStore } from '@/features/memo-overlay';
import { deleteCustomEvent } from '@/lib/db';
import type { EventRow } from '@/types';
import { useCustomEventOperations } from '../use-custom-event-operations';

vi.mock('@/lib/db', () => ({
  deleteCustomEvent: vi.fn(),
}));

describe('useCustomEventOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMemoOverlayStore.getState().reset('EVENT');
  });

  it('初期状態が正しくセットアップされていること', () => {
    const { result } = renderHook(() => useCustomEventOperations());

    expect(result.current.refreshTrigger).toBe(0);
    expect(typeof result.current.handleRefreshCustomEvents).toBe('function');
    expect(typeof result.current.handleDeleteCustomEvent).toBe('function');
    expect(typeof result.current.handleEditCustomEvent).toBe('function');
  });

  it('handleRefreshCustomEvents を呼ぶと refreshTrigger がインクリメントされること', () => {
    const { result } = renderHook(() => useCustomEventOperations());

    act(() => {
      result.current.handleRefreshCustomEvents();
    });

    expect(result.current.refreshTrigger).toBe(1);

    act(() => {
      result.current.handleRefreshCustomEvents();
    });

    expect(result.current.refreshTrigger).toBe(2);
  });

  it('handleDeleteCustomEvent で confirm がキャンセルの場合は削除処理を行わないこと', async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    const { result } = renderHook(() => useCustomEventOperations());

    await act(async () => {
      await result.current.handleDeleteCustomEvent('evt-1');
    });

    expect(deleteCustomEvent).not.toHaveBeenCalled();
    expect(result.current.refreshTrigger).toBe(0);
  });

  it('handleDeleteCustomEvent で confirm が OK の場合は削除を実行し refreshTrigger をインクリメントすること', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    vi.mocked(deleteCustomEvent).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCustomEventOperations());

    await act(async () => {
      await result.current.handleDeleteCustomEvent('evt-1');
    });

    expect(deleteCustomEvent).toHaveBeenCalledWith('evt-1');
    expect(result.current.refreshTrigger).toBe(1);
  });

  it('handleEditCustomEvent で渡されたイベント情報が useMemoOverlayStore にセットされること', () => {
    const { result } = renderHook(() => useCustomEventOperations());

    const dummyEvent: EventRow = {
      id: 12345,
      match_id: 'match-1',
      period: 1,
      minute: 23,
      second: 4,
      custom_label: 'Pressing / Counter',
      custom_memo: 'Nice tactical interception',
    } as unknown as EventRow;

    act(() => {
      result.current.handleEditCustomEvent(dummyEvent);
    });

    const state = useMemoOverlayStore.getState();
    expect(state.eventId).toBe('12345');
    expect(state.period).toBe(1);
    expect(state.timeStr).toBe('23:04');
    expect(state.selectedLabels).toEqual(['Pressing', 'Counter']);
    expect(state.memo).toBe('Nice tactical interception');
    expect(state.phase).toBe(2);
    expect(state.isModalOpen).toBe(true);
  });
});
