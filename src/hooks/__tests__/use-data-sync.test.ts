import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoOverlayStore } from '@/features/memo-overlay';
import {
  customEventKeys,
  eventKeys,
  matchKeys,
  playerKeys,
} from '@/lib/query-keys';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import { useDataSync } from '../use-data-sync';

describe('useDataSync', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    useMemoOverlayStore.getState().setIsSaving(false);
  });

  describe('単一プロトコル化 (postMessage のみ受信)', () => {
    it('postMessage 受信時にキャッシュ無効化が実行されること (matchId あり)', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      renderHook(() => useDataSync(), { wrapper: createWrapper() });

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'footics-action',
              detail: {
                action: SHORTCUT_ACTIONS.REFRESH_DATA,
                matchId: 'match-123',
              },
            },
          }),
        );
      });

      // 選手クエリ + 特定試合クエリ群 (customEvents, events, detail, memo)
      expect(invalidateSpy).toHaveBeenCalledTimes(5);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: playerKeys.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: customEventKeys.byMatch('match-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: eventKeys.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: matchKeys.detail('match-123'),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: matchKeys.memo('match-123'),
      });
    });

    it('postMessage 受信時にキャッシュ無効化が実行されること (matchId なし)', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      renderHook(() => useDataSync(), { wrapper: createWrapper() });

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'footics-action',
              detail: {
                action: SHORTCUT_ACTIONS.REFRESH_DATA,
              },
            },
          }),
        );
      });

      // 選手クエリ + 全体クエリ群 (customEvents, events, matches)
      expect(invalidateSpy).toHaveBeenCalledTimes(4);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: playerKeys.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: customEventKeys.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: eventKeys.all,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: matchKeys.all,
      });
    });

    it('CustomEvent が発火してもハンドラが反応しないこと (二重発火防止・CustomEvent 撤去の検証)', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      renderHook(() => useDataSync(), { wrapper: createWrapper() });

      act(() => {
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: {
              action: SHORTCUT_ACTIONS.REFRESH_DATA,
              matchId: 'match-123',
            },
          }),
        );
      });

      // CustomEvent は無視されなければならない
      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('不正なメッセージの防御', () => {
    it('type が footics-action 以外の場合は無視されること', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      renderHook(() => useDataSync(), { wrapper: createWrapper() });

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'unknown-action',
              detail: {
                action: SHORTCUT_ACTIONS.REFRESH_DATA,
              },
            },
          }),
        );
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('action が REFRESH_DATA 以外の場合は無視されること', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      renderHook(() => useDataSync(), { wrapper: createWrapper() });

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'footics-action',
              detail: {
                action: 'SOME_OTHER_ACTION',
              },
            },
          }),
        );
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it('data や detail が null / 不正な形式の場合はエラーにならず無視されること', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      renderHook(() => useDataSync(), { wrapper: createWrapper() });

      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: null }));
        window.dispatchEvent(
          new MessageEvent('message', { data: 'plain string' }),
        );
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { type: 'footics-action', detail: null },
          }),
        );
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { type: 'footics-action' },
          }),
        );
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });

  describe('isSaving フラグリセットとクリーンアップ', () => {
    it('isSaving が true の場合に REFRESH_DATA 受信で false にリセットされること', () => {
      useMemoOverlayStore.getState().setIsSaving(true);
      expect(useMemoOverlayStore.getState().isSaving).toBe(true);

      renderHook(() => useDataSync(), { wrapper: createWrapper() });

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'footics-action',
              detail: {
                action: SHORTCUT_ACTIONS.REFRESH_DATA,
              },
            },
          }),
        );
      });

      expect(useMemoOverlayStore.getState().isSaving).toBe(false);
    });

    it('アンマウント時にイベントリスナーが解除されること', () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { unmount } = renderHook(() => useDataSync(), {
        wrapper: createWrapper(),
      });

      unmount();

      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              type: 'footics-action',
              detail: {
                action: SHORTCUT_ACTIONS.REFRESH_DATA,
              },
            },
          }),
        );
      });

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });
});
