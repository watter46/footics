import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMemoOverlayStore } from '../../stores/memo-overlay-store';
import { MemoOverlayView } from '../MemoOverlayView';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Comprehensive test suite for MemoOverlayView
describe('MemoOverlayView Refactor & Host Isolation', () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useMemoOverlayStore.getState().reset('MATCH');
    const g = globalThis as Record<string, unknown>;
    delete g.browser;
    delete g.chrome;
  });

  describe('ホスト境界隔離 & 純粋環境レンダリング', () => {
    it('ホストAPI(browser/chrome/IndexedDB)が存在しない環境でクラッシュせず描画される', () => {
      render(
        <MemoOverlayView
          matchId="test-match-1"
          onClose={onClose}
          onSave={onSave}
        />,
      );

      expect(
        screen.getByRole('dialog', { name: 'Memo Overlay' }),
      ).toBeDefined();
      expect(screen.getByText(/Target: test-match-1/i)).toBeDefined();
    });
  });

  describe('Props 確定注入 (initialMemo / initialData.memo)', () => {
    it('initialMemo で渡されたメモが即座に反映される（Flickerゼロ）', () => {
      render(
        <MemoOverlayView
          matchId="test-match-1"
          initialMemo="対戦相手のビルドアップ分析メモ"
          onClose={onClose}
          onSave={onSave}
        />,
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('対戦相手のビルドアップ分析メモ');
    });

    it('initialData.memo で渡されたメモが反映される', () => {
      render(
        <MemoOverlayView
          matchId="test-match-1"
          initialData={{ memo: 'initialData経由のメモ' }}
          onClose={onClose}
          onSave={onSave}
        />,
      );

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('initialData経由のメモ');
    });
  });

  describe('フェーズ遷移 & アクションコールバック', () => {
    beforeEach(() => {
      useMemoOverlayStore.getState().reset('EVENT');
    });

    it('EVENT モードで時間入力後に NEXT で Phase 1 へ進み、BACK で Phase 0 に戻る', () => {
      render(
        <MemoOverlayView
          matchId="test-match-1"
          onClose={onClose}
          onSave={onSave}
        />,
      );

      act(() => {
        useMemoOverlayStore.getState().setTimeStr('15:00');
      });

      const nextButton = screen.getByRole('button', { name: /NEXT/i });
      fireEvent.click(nextButton);

      expect(useMemoOverlayStore.getState().phase).toBe(1);
      const backButton = screen.getByRole('button', { name: /BACK/i });
      expect(backButton).toBeDefined();

      fireEvent.click(backButton);
      expect(useMemoOverlayStore.getState().phase).toBe(0);
    });

    it('Phase 2 で PERSIST EVENT ボタンを押すと onSave が呼ばれる', () => {
      act(() => {
        useMemoOverlayStore.getState().setTimeStr('15:00');
        useMemoOverlayStore.getState().addLabel('Shot');
        useMemoOverlayStore.getState().forceSetPhase(2);
      });

      render(
        <MemoOverlayView
          matchId="test-match-1"
          onClose={onClose}
          onSave={onSave}
        />,
      );

      const saveButton = screen.getByRole('button', {
        name: /PERSIST EVENT/i,
      });
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('ヘッダーの閉じるボタンを押すと onClose が呼ばれる', () => {
      render(
        <MemoOverlayView
          matchId="test-match-1"
          onClose={onClose}
          onSave={onSave}
        />,
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
