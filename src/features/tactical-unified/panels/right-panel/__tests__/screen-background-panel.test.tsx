import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { RightPanel } from '../right-panel';
import { ScreenBackgroundPanel } from '../screen-background-panel';

describe('ScreenBackgroundPanel & RightPanel screen tab', () => {
  beforeEach(() => {
    const mockCtx = new Proxy(
      {
        getImageData: () => ({ data: new Array(4) }),
        createImageData: () => [],
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        measureText: () => ({ width: 0 }),
        getLineDash: () => [],
        isPointInPath: () => true,
      } as Record<string, unknown>,
      {
        get: (target, prop: string) =>
          prop in target ? target[prop] : vi.fn(),
      },
    );
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    useTacticalUnifiedStore.getState().resetProject();
  });

  describe('ScreenBackgroundPanel', () => {
    it('renders title and description properly', () => {
      render(<ScreenBackgroundPanel />);

      expect(screen.getByText('Screen Background')).toBeDefined();
      expect(
        screen.getByText('ピッチ外周の画面背景を設定します'),
      ).toBeDefined();
    });

    it('displays cinematic and dark cards and allows toggling', () => {
      render(<ScreenBackgroundPanel />);

      const cinematicCard = screen
        .getByText('ダークシネマティック')
        .closest('button');
      const darkCard = screen.getByText('単色ダーク').closest('button');

      expect(cinematicCard).not.toBeNull();
      expect(darkCard).not.toBeNull();

      // Initial state is cinematic
      expect(
        useTacticalUnifiedStore.getState().project.screenBackground?.type,
      ).toBe('cinematic');

      // Click dark
      if (darkCard) {
        fireEvent.click(darkCard);
      }

      expect(
        useTacticalUnifiedStore.getState().project.screenBackground?.type,
      ).toBe('dark');

      // Click cinematic
      if (cinematicCard) {
        fireEvent.click(cinematicCard);
      }

      expect(
        useTacticalUnifiedStore.getState().project.screenBackground?.type,
      ).toBe('cinematic');
    });
  });

  describe('RightPanel Screen Tab Integration', () => {
    it('expands right panel and renders screen background panel when screen rail icon is clicked', () => {
      render(<RightPanel />);

      const screenRailBtn = screen.getByRole('button', { name: /screen/i });
      expect(screenRailBtn).toBeDefined();

      fireEvent.click(screenRailBtn);

      expect(screen.getByText('Screen Background')).toBeDefined();
    });

    it('switches to screen tab via segmented control when panel is open', () => {
      useTacticalUnifiedStore.getState().setRightPanelOpen(true);
      render(<RightPanel />);

      const screenTab = screen.getByRole('radio', { name: /screen/i });
      expect(screenTab).toBeDefined();

      fireEvent.click(screenTab);

      expect(screen.getByText('Screen Background')).toBeDefined();
    });
  });
});
