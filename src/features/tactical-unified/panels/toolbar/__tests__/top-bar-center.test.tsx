import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import { TopBarCenter } from '../top-bar-center';

const radio = (name: string) => screen.getByRole('radio', { name });

function renderTopBarCenter() {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const documentStore = createDocumentStore(project);
  documentStore.getState().dispatch({
    type: 'CHANGE_PHASE_ASPECT_RATIO',
    phaseId: p0.id,
    aspectRatio: '16:9',
  });
  const stores = {
    documentStore,
    sessionStore: createSessionStore({
      activePhaseId: p0.id,
      activeSlideId: p0.slides[0]?.id ?? '',
    }),
    playbackStore: createPlaybackStore(),
  };
  return {
    stores,
    ...render(
      <TacticalStoreProvider stores={stores}>
        <TopBarCenter />
      </TacticalStoreProvider>,
    ),
  };
}

describe('TopBarCenter aspect ratio selector', () => {
  it('renders all 4 aspect ratio options (16:9, 9:16, 4:5, 1:1)', () => {
    renderTopBarCenter();

    for (const label of ['16:9', '9:16', '4:5', '1:1']) {
      expect(radio(label)).toBeDefined();
    }
  });

  it('defaults to 16:9 as active and allows switching to 9:16, 4:5, 1:1', () => {
    const { stores } = renderTopBarCenter();

    expect(radio('16:9').getAttribute('aria-checked')).toBe('true');
    expect(radio('9:16').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('9:16'));
    expect(stores.documentStore.getState().project.phases[0]?.aspectRatio).toBe(
      '9:16',
    );
    expect(radio('9:16').getAttribute('aria-checked')).toBe('true');
    expect(radio('16:9').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('4:5'));
    expect(stores.documentStore.getState().project.phases[0]?.aspectRatio).toBe(
      '4:5',
    );

    fireEvent.click(radio('1:1'));
    expect(stores.documentStore.getState().project.phases[0]?.aspectRatio).toBe(
      '1:1',
    );
  });

  it('allows toggling team visibility', () => {
    const { stores } = renderTopBarCenter();

    fireEvent.click(radio('Home'));
    expect(stores.sessionStore.getState().teamVisibility).toBe('home');

    fireEvent.click(radio('Away'));
    expect(stores.sessionStore.getState().teamVisibility).toBe('away');

    fireEvent.click(radio('Both'));
    expect(stores.sessionStore.getState().teamVisibility).toBe('both');
  });

  it('renders reset squad button and triggers RESET_SLIDE_KEEP_SQUAD', () => {
    const { stores } = renderTopBarCenter();

    const resetBtn = screen.getByRole('button', {
      name: '配置・オブジェクトをリセット（メンバー維持）',
    });
    expect(resetBtn).toBeDefined();

    const { activePhaseId, activeSlideId } = stores.sessionStore.getState();
    const slide0 = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
    const player0 = slide0?.players[0];
    expect(player0).toBeDefined();
    stores.documentStore.getState().dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: {
        type: 'MOVE_PLAYERS',
        moves: [
          {
            id: player0!.id,
            x: toScreenNormCoord(99),
            y: toScreenNormCoord(99),
          },
        ],
      },
    });

    fireEvent.click(resetBtn);

    const updatedSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
    const updatedPlayer0 = updatedSlide?.players.find(
      (p) => p.id === player0?.id,
    );
    expect(updatedPlayer0?.area).toBe('pitch');
    if (updatedPlayer0?.area === 'pitch') {
      expect(updatedPlayer0.x).not.toBe(99);
      expect(updatedPlayer0.y).not.toBe(99);
    }
  });

  it('renders Swap and Reset icon buttons with shrink-0', () => {
    renderTopBarCenter();

    const swapBtn = screen.getByRole('button', { name: 'Swap team sides' });
    expect(swapBtn).toBeDefined();
    expect(swapBtn.className).toContain('shrink-0');

    const resetBtn = screen.getByRole('button', {
      name: '配置・オブジェクトをリセット（メンバー維持）',
    });
    expect(resetBtn).toBeDefined();
    expect(resetBtn.className).toContain('shrink-0');
  });

  it('allows toggling workspace mode using Toggle Layout Mode button', () => {
    const { stores } = renderTopBarCenter();

    expect(screen.queryByRole('radio', { name: '作図' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '演出' })).toBeNull();

    const toggleBtn = screen.getByRole('button', {
      name: 'Toggle Layout Mode',
    });
    expect(toggleBtn).toBeDefined();
    expect(stores.sessionStore.getState().workspaceMode).toBe('board');

    fireEvent.click(toggleBtn);
    expect(stores.sessionStore.getState().workspaceMode).toBe('director');

    fireEvent.click(toggleBtn);
    expect(stores.sessionStore.getState().workspaceMode).toBe('board');
  });
});
