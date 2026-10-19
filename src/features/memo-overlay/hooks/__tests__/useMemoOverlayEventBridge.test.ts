import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoOverlayStore } from '../../stores/memo-overlay-store';
import { EVENT_BRIDGE_HANDLERS } from '../event-bridge-handlers';
import { useMemoOverlayEventBridge } from '../useMemoOverlayEventBridge';

describe('useMemoOverlayEventBridge & EVENT_BRIDGE_HANDLERS', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useMemoOverlayStore.getState().reset('EVENT');
  });

  describe('EVENT_BRIDGE_HANDLERS mapping', () => {
    it('全主要アクションがハンドラマップに定義されていること', () => {
      const actions = [
        'TOGGLE_MATCH_MEMO',
        'TOGGLE_EVENT_MEMO',
        'CLOSE_OVERLAY',
        'SAVE_MEMO',
        'NEXT_PHASE',
        'PREV_PHASE',
        'BACKSPACE',
        'NAVIGATE_SUGGESTION',
        'FILTER_CATEGORY',
      ];
      for (const action of actions) {
        expect(EVENT_BRIDGE_HANDLERS[action]).toBeDefined();
        expect(typeof EVENT_BRIDGE_HANDLERS[action]).toBe('function');
      }
    });
  });

  describe('useMemoOverlayEventBridge hook integration', () => {
    it('TOGGLE_MATCH_MEMO で onOpen が呼ばれること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: {
              action: 'TOGGLE_MATCH_MEMO',
              matchId: 'match-123',
              memo: 'sample memo',
            },
          }),
        );
      });

      expect(onOpen).toHaveBeenCalledWith({
        mode: 'MATCH',
        matchId: 'match-123',
        data: { memo: 'sample memo' },
      });
    });

    it('TOGGLE_EVENT_MEMO で onOpen が呼ばれること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: {
              action: 'TOGGLE_EVENT_MEMO',
              matchId: 'match-456',
              id: 'event-789',
              period: 2,
              minute: 45,
              second: 30,
              labels: ['Goal', 'Shot'],
              memo: 'Great goal',
            },
          }),
        );
      });

      expect(onOpen).toHaveBeenCalledWith({
        mode: 'EVENT',
        matchId: 'match-456',
        data: {
          id: 'event-789',
          period: 2,
          minute: 45,
          second: 30,
          labels: ['Goal', 'Shot'],
          memo: 'Great goal',
        },
      });
    });

    it('CLOSE_OVERLAY で onClose が呼ばれること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'CLOSE_OVERLAY' },
          }),
        );
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('SAVE_MEMO で onSave が呼ばれること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'SAVE_MEMO' },
          }),
        );
      });

      expect(onSave).toHaveBeenCalled();
    });

    it('NEXT_PHASE: EVENTモードでは store.nextPhase が実行されること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      const nextPhaseSpy = vi.spyOn(
        useMemoOverlayStore.getState(),
        'nextPhase',
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'NEXT_PHASE' },
          }),
        );
      });

      expect(nextPhaseSpy).toHaveBeenCalled();
      nextPhaseSpy.mockRestore();
    });

    it('NEXT_PHASE: MATCHモードでは onSave が実行されること', () => {
      useMemoOverlayStore.getState().reset('MATCH');
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'NEXT_PHASE' },
          }),
        );
      });

      expect(onSave).toHaveBeenCalled();
    });

    it('PREV_PHASE: store.prevPhase が実行されること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      const prevPhaseSpy = vi.spyOn(
        useMemoOverlayStore.getState(),
        'prevPhase',
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'PREV_PHASE' },
          }),
        );
      });

      expect(prevPhaseSpy).toHaveBeenCalled();
      prevPhaseSpy.mockRestore();
    });

    it('BACKSPACE: phase 0 では backspaceTimeStr が実行されること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      const backspaceTimeSpy = vi.spyOn(
        useMemoOverlayStore.getState(),
        'backspaceTimeStr',
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'BACKSPACE' },
          }),
        );
      });

      expect(backspaceTimeSpy).toHaveBeenCalled();
      backspaceTimeSpy.mockRestore();
    });

    it('BACKSPACE: phase 1 では backspaceLabel が実行されること', () => {
      useMemoOverlayStore.getState().forceSetPhase(1);
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      const backspaceLabelSpy = vi.spyOn(
        useMemoOverlayStore.getState(),
        'backspaceLabel',
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'BACKSPACE' },
          }),
        );
      });

      expect(backspaceLabelSpy).toHaveBeenCalled();
      backspaceLabelSpy.mockRestore();
    });

    it('NAVIGATE_SUGGESTION: phase 1 で ArrowDown / ArrowUp が store.navigateSuggestion に渡されること', () => {
      useMemoOverlayStore.getState().forceSetPhase(1);
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      const navigateSpy = vi.spyOn(
        useMemoOverlayStore.getState(),
        'navigateSuggestion',
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'NAVIGATE_SUGGESTION', key: 'ArrowDown' },
          }),
        );
      });
      expect(navigateSpy).toHaveBeenCalledWith(1);

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'NAVIGATE_SUGGESTION', key: 'ArrowUp' },
          }),
        );
      });
      expect(navigateSpy).toHaveBeenCalledWith(-1);

      navigateSpy.mockRestore();
    });

    it('FILTER_CATEGORY: categoryIndex が指定された場合に store.filterByCategory が実行されること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      const filterSpy = vi.spyOn(
        useMemoOverlayStore.getState(),
        'filterByCategory',
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'FILTER_CATEGORY', categoryIndex: 3 },
          }),
        );
      });

      expect(filterSpy).toHaveBeenCalledWith(3);
      filterSpy.mockRestore();
    });

    it('isActive = false の場合、開く操作（TOGGLE_*）以外は無視されること', () => {
      renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, false),
      );

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'SAVE_MEMO' },
          }),
        );
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'CLOSE_OVERLAY' },
          }),
        );
      });

      expect(onSave).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      // 開く操作は isActive = false でも実行されること
      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'TOGGLE_MATCH_MEMO', matchId: 'm1' },
          }),
        );
      });

      expect(onOpen).toHaveBeenCalledWith({
        mode: 'MATCH',
        matchId: 'm1',
        data: { memo: undefined },
      });
    });

    it('アンマウント時にイベントリスナーが解除されること', () => {
      const { unmount } = renderHook(() =>
        useMemoOverlayEventBridge(onClose, onSave, onOpen, true),
      );

      unmount();

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'SAVE_MEMO' },
          }),
        );
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
