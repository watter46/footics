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

    describe('Boundary Box Section & Presets', () => {
      it('renders boundary box toggle and only 4 preset buttons (16:9, 9:16, 4:5, 1:1)', () => {
        render(<ScreenBackgroundPanel />);

        expect(screen.getByText('Boundary Box')).toBeDefined();
        const toggleBtn = screen.getByRole('switch', { name: /境界線/i });
        expect(toggleBtn).toBeDefined();

        expect(screen.getByRole('button', { name: /^16:9/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /^9:16/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /^4:5/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /^1:1/i })).toBeDefined();

        expect(
          screen.queryByRole('button', { name: /全画面16:9/i }),
        ).toBeNull();
        expect(
          screen.queryByRole('button', { name: /ピッチフィット横/i }),
        ).toBeNull();
        expect(
          screen.queryByRole('button', { name: /ピッチフィット縦/i }),
        ).toBeNull();
      });

      it('toggles boundary box enabled state when toggle button is clicked', () => {
        render(<ScreenBackgroundPanel />);

        const toggleBtn = screen.getByRole('switch', { name: /境界線/i });
        const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;

        // Default: enabled is true
        expect(
          useTacticalUnifiedStore
            .getState()
            .project.slides.find((s) => s.id === activeSlideId)?.boundaryBox
            ?.enabled,
        ).toBe(true);

        // Click toggle to disable
        fireEvent.click(toggleBtn);
        expect(
          useTacticalUnifiedStore
            .getState()
            .project.slides.find((s) => s.id === activeSlideId)?.boundaryBox
            ?.enabled,
        ).toBe(false);

        // Click toggle to enable
        fireEvent.click(toggleBtn);
        expect(
          useTacticalUnifiedStore
            .getState()
            .project.slides.find((s) => s.id === activeSlideId)?.boundaryBox
            ?.enabled,
        ).toBe(true);
      });

      it('applies 16:9 preset and updates active slide boundaryBox', () => {
        render(<ScreenBackgroundPanel />);

        const btn169 = screen.getByRole('button', { name: /^16:9/i });
        fireEvent.click(btn169);

        const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
        const activeSlide = useTacticalUnifiedStore
          .getState()
          .project.slides.find((s) => s.id === activeSlideId);

        expect(activeSlide?.boundaryBox?.width).toBe(100);
        expect(activeSlide?.boundaryBox?.height).toBe(100);
        expect(activeSlide?.boundaryBox?.x).toBe(0);
        expect(activeSlide?.boundaryBox?.y).toBe(0);
        expect(activeSlide?.boundaryBox?.enabled).toBe(true);
      });

      it('applies 4:5 preset and updates active slide boundaryBox', () => {
        render(<ScreenBackgroundPanel />);

        const btn45 = screen.getByRole('button', { name: /^4:5/i });
        fireEvent.click(btn45);

        const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
        const activeSlide = useTacticalUnifiedStore
          .getState()
          .project.slides.find((s) => s.id === activeSlideId);

        expect(activeSlide?.boundaryBox?.width).toBe(45);
        expect(activeSlide?.boundaryBox?.height).toBe(100);
        expect(activeSlide?.boundaryBox?.x).toBe(27.5);
        expect(activeSlide?.boundaryBox?.y).toBe(0);
        expect(activeSlide?.boundaryBox?.enabled).toBe(true);
      });

      it('applies 9:16 preset and updates active slide boundaryBox', () => {
        render(<ScreenBackgroundPanel />);

        const btn916 = screen.getByRole('button', { name: /^9:16/i });
        fireEvent.click(btn916);

        const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
        const activeSlide = useTacticalUnifiedStore
          .getState()
          .project.slides.find((s) => s.id === activeSlideId);

        expect(activeSlide?.boundaryBox?.width).toBe(31.64);
        expect(activeSlide?.boundaryBox?.height).toBe(100);
        expect(activeSlide?.boundaryBox?.x).toBe(34.18);
        expect(activeSlide?.boundaryBox?.enabled).toBe(true);
      });

      it('applies 1:1 preset with correct aspect ratio', () => {
        render(<ScreenBackgroundPanel />);

        const btn11 = screen.getByRole('button', { name: /^1:1/i });
        fireEvent.click(btn11);

        const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
        const activeSlide = useTacticalUnifiedStore
          .getState()
          .project.slides.find((s) => s.id === activeSlideId);

        expect(activeSlide?.boundaryBox?.width).toBe(56.25);
        expect(activeSlide?.boundaryBox?.height).toBe(100);
        expect(activeSlide?.boundaryBox?.x).toBe(21.88);
      });
    });
  });

  describe('RightPanel Screen Tab Integration', () => {
    beforeEach(() => {
      useTacticalUnifiedStore.getState().setWorkspaceMode('director');
    });

    it('expands right panel and renders screen background panel when screen rail icon is clicked', () => {
      useTacticalUnifiedStore.getState().setRightPanelOpen(false);
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
