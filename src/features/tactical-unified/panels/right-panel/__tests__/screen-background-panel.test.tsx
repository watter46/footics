import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { RightPanel } from '../right-panel';
import { ScreenBackgroundPanel } from '../screen-background-panel';

function renderWithDomainStores(
  ui: React.ReactElement,
  options?: {
    isRightPanelOpen?: boolean;
    workspaceMode?: 'board' | 'director';
  },
) {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const sessionStore = createSessionStore({
    activePhaseId: p0.id,
    activeSlideId: p0.slides[0]?.id ?? '',
    workspaceMode: options?.workspaceMode,
  });
  if (options?.isRightPanelOpen !== undefined) {
    sessionStore.getState().setRightPanelOpen(options.isRightPanelOpen);
  }
  const stores = {
    documentStore: createDocumentStore(project),
    sessionStore,
    playbackStore: createPlaybackStore(),
  };
  return {
    stores,
    phaseId: p0.id,
    ...render(
      <TacticalStoreProvider stores={stores}>{ui}</TacticalStoreProvider>,
    ),
  };
}

describe('ScreenBackgroundPanel & RightPanel screen tab', () => {
  describe('ScreenBackgroundPanel', () => {
    it('renders title and description properly', () => {
      renderWithDomainStores(<ScreenBackgroundPanel />);

      expect(screen.getByText('Screen Background')).toBeDefined();
      expect(
        screen.getByText('ピッチ外周の画面背景を設定します'),
      ).toBeDefined();
    });

    it('displays cinematic and dark cards and allows toggling', () => {
      const { stores } = renderWithDomainStores(<ScreenBackgroundPanel />);

      const cinematicCard = screen
        .getByText('ダークシネマティック')
        .closest('button');
      const darkCard = screen.getByText('単色ダーク').closest('button');

      expect(cinematicCard).not.toBeNull();
      expect(darkCard).not.toBeNull();

      // Initial state is cinematic
      expect(
        stores.documentStore.getState().project.screenBackground?.type,
      ).toBe('cinematic');

      // Click dark
      if (darkCard) {
        fireEvent.click(darkCard);
      }

      expect(
        stores.documentStore.getState().project.screenBackground?.type,
      ).toBe('dark');

      // Click cinematic
      if (cinematicCard) {
        fireEvent.click(cinematicCard);
      }

      expect(
        stores.documentStore.getState().project.screenBackground?.type,
      ).toBe('cinematic');
    });

    describe('Boundary Box Section & Presets', () => {
      it('renders boundary box toggle and only 4 preset buttons (16:9, 9:16, 4:5, 1:1)', () => {
        renderWithDomainStores(<ScreenBackgroundPanel />);

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
        const { stores, phaseId } = renderWithDomainStores(
          <ScreenBackgroundPanel />,
        );

        const toggleBtn = screen.getByRole('switch', { name: /境界線/i });

        // Default: enabled is true
        expect(
          selectDomainActivePhase(
            stores.documentStore.getState().project,
            phaseId,
          )?.boundaryBox?.enabled,
        ).toBe(true);

        // Click toggle to disable
        fireEvent.click(toggleBtn);
        expect(
          selectDomainActivePhase(
            stores.documentStore.getState().project,
            phaseId,
          )?.boundaryBox?.enabled,
        ).toBe(false);

        // Click toggle to enable
        fireEvent.click(toggleBtn);
        expect(
          selectDomainActivePhase(
            stores.documentStore.getState().project,
            phaseId,
          )?.boundaryBox?.enabled,
        ).toBe(true);
      });

      it('applies 16:9 preset and updates active phase boundaryBox', () => {
        const { stores, phaseId } = renderWithDomainStores(
          <ScreenBackgroundPanel />,
        );

        const btn169 = screen.getByRole('button', { name: /^16:9/i });
        fireEvent.click(btn169);

        const activePhase = selectDomainActivePhase(
          stores.documentStore.getState().project,
          phaseId,
        );

        expect(activePhase?.boundaryBox?.width).toBe(100);
        expect(activePhase?.boundaryBox?.height).toBe(100);
        expect(activePhase?.boundaryBox?.x).toBe(0);
        expect(activePhase?.boundaryBox?.y).toBe(0);
        expect(activePhase?.boundaryBox?.enabled).toBe(true);
      });

      it('applies 4:5 preset and updates active phase boundaryBox', () => {
        const { stores, phaseId } = renderWithDomainStores(
          <ScreenBackgroundPanel />,
        );

        const btn45 = screen.getByRole('button', { name: /^4:5/i });
        fireEvent.click(btn45);

        const activePhase = selectDomainActivePhase(
          stores.documentStore.getState().project,
          phaseId,
        );

        expect(activePhase?.boundaryBox?.width).toBe(45);
        expect(activePhase?.boundaryBox?.height).toBe(100);
        expect(activePhase?.boundaryBox?.x).toBe(27.5);
        expect(activePhase?.boundaryBox?.y).toBe(0);
        expect(activePhase?.boundaryBox?.enabled).toBe(true);
      });

      it('applies 9:16 preset and updates active phase boundaryBox', () => {
        const { stores, phaseId } = renderWithDomainStores(
          <ScreenBackgroundPanel />,
        );

        const btn916 = screen.getByRole('button', { name: /^9:16/i });
        fireEvent.click(btn916);

        const activePhase = selectDomainActivePhase(
          stores.documentStore.getState().project,
          phaseId,
        );

        expect(activePhase?.boundaryBox?.width).toBe(31.64);
        expect(activePhase?.boundaryBox?.height).toBe(100);
        expect(activePhase?.boundaryBox?.x).toBe(34.18);
        expect(activePhase?.boundaryBox?.enabled).toBe(true);
      });

      it('applies 1:1 preset with correct aspect ratio', () => {
        const { stores, phaseId } = renderWithDomainStores(
          <ScreenBackgroundPanel />,
        );

        const btn11 = screen.getByRole('button', { name: /^1:1/i });
        fireEvent.click(btn11);

        const activePhase = selectDomainActivePhase(
          stores.documentStore.getState().project,
          phaseId,
        );

        expect(activePhase?.boundaryBox?.width).toBe(56.25);
        expect(activePhase?.boundaryBox?.height).toBe(100);
        expect(activePhase?.boundaryBox?.x).toBe(21.88);
      });
    });
  });

  describe('RightPanel Screen Tab Integration', () => {
    it('expands right panel and renders screen background panel when screen rail icon is clicked', () => {
      renderWithDomainStores(<RightPanel />, {
        isRightPanelOpen: false,
        workspaceMode: 'director',
      });

      const screenRailBtn = screen.getByRole('button', { name: /screen/i });
      expect(screenRailBtn).toBeDefined();

      fireEvent.click(screenRailBtn);

      expect(screen.getByText('Screen Background')).toBeDefined();
    });

    it('switches to screen tab via segmented control when panel is open', () => {
      renderWithDomainStores(<RightPanel />, {
        isRightPanelOpen: true,
        workspaceMode: 'director',
      });

      const screenTab = screen.getByRole('radio', { name: /screen/i });
      expect(screenTab).toBeDefined();

      fireEvent.click(screenTab);

      expect(screen.getByText('Screen Background')).toBeDefined();
    });
  });
});
