import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import { QUICK_TAGS } from '../../../constants/quick-tags';
import { QuickTagBar } from '../components/QuickTagBar';
import { useOverlayShortcutInterceptor } from '../hooks/use-overlay-shortcut-interceptor';
import { useOverlayStore } from '../stores/use-overlay-store';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Comprehensive test suite for QuickTagBar & Shortcuts
describe('QuickTagBar & Shortcuts', () => {
  beforeEach(() => {
    const memoStore = useMemoOverlayStore.getState();
    memoStore.reset('EVENT');
    const overlayStore = useOverlayStore.getState();
    overlayStore.open({ mode: 'EVENT', matchId: 'm1' });
  });

  describe('QUICK_TAGS constant', () => {
    it('defines expected preset tags and shortcuts 1 to 4', () => {
      expect(QUICK_TAGS).toHaveLength(4);
      expect(QUICK_TAGS.map((t) => t.shortcut)).toEqual(['1', '2', '3', '4']);
      expect(QUICK_TAGS.map((t) => t.label)).toEqual([
        'ビルドアップ',
        'プレス',
        'トランジション',
        'セットプレー',
      ]);
    });
  });

  describe('QuickTagBar Component', () => {
    it('renders all quick tag buttons with shortcuts', () => {
      render(<QuickTagBar />);

      for (const tag of QUICK_TAGS) {
        expect(screen.getByText(tag.label)).toBeInTheDocument();
        expect(screen.getByText(tag.shortcut)).toBeInTheDocument();
      }
    });

    it('toggles tag selection on click and applies amber highlight', () => {
      render(<QuickTagBar />);

      const buildupButton = screen.getByText('ビルドアップ').closest('button');
      expect(buildupButton).not.toBeNull();
      if (!buildupButton) return;
      expect(buildupButton.className).not.toContain('bg-amber-500/20');

      // Click to select
      fireEvent.click(buildupButton);
      expect(useMemoOverlayStore.getState().selectedLabels).toContain(
        'ビルドアップ',
      );
      expect(buildupButton.className).toContain('bg-amber-500/20');

      // Click again to unselect
      fireEvent.click(buildupButton);
      expect(useMemoOverlayStore.getState().selectedLabels).not.toContain(
        'ビルドアップ',
      );
      expect(buildupButton.className).not.toContain('bg-amber-500/20');
    });
  });

  describe('useOverlayShortcutInterceptor for number keys', () => {
    const TestComponent = () => {
      useOverlayShortcutInterceptor();
      return (
        <div>
          <input data-testid="test-input" />
          <textarea data-testid="test-textarea" />
        </div>
      );
    };

    it('toggles quick tag when pressing key 1 in EVENT mode outside inputs', () => {
      render(<TestComponent />);

      act(() => {
        fireEvent.keyDown(document.body, {
          key: '1',
          code: 'Digit1',
          keyCode: 49,
          which: 49,
        });
      });

      expect(useMemoOverlayStore.getState().selectedLabels).toContain(
        'ビルドアップ',
      );

      // Press again to toggle off
      act(() => {
        fireEvent.keyDown(document.body, {
          key: '1',
          code: 'Digit1',
          keyCode: 49,
          which: 49,
        });
      });

      expect(useMemoOverlayStore.getState().selectedLabels).not.toContain(
        'ビルドアップ',
      );
    });

    it('does not toggle quick tag when focus is in input element', () => {
      render(<TestComponent />);

      const input = screen.getByTestId('test-input');
      input.focus();

      act(() => {
        fireEvent.keyDown(input, {
          key: '1',
          code: 'Digit1',
          keyCode: 49,
          which: 49,
        });
      });

      expect(useMemoOverlayStore.getState().selectedLabels).toEqual([]);
    });

    it('does not toggle quick tag when mode is MATCH', () => {
      useOverlayStore.getState().open({ mode: 'MATCH', matchId: 'm1' });
      render(<TestComponent />);

      act(() => {
        fireEvent.keyDown(document.body, {
          key: '1',
          code: 'Digit1',
          keyCode: 49,
          which: 49,
        });
      });

      expect(useMemoOverlayStore.getState().selectedLabels).toEqual([]);
    });
  });
});
