import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { VisionConeAction } from '@/features/tactical-unified/core/components/hud/player-quick-actions';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { createDefaultDomainPlayers } from '@/lib/tactical/domain/default-players';

function renderWithStore(
  ui: React.ReactElement,
  stores?: {
    documentStore: ReturnType<typeof createDocumentStore>;
    sessionStore: ReturnType<typeof createSessionStore>;
  },
) {
  const documentStore =
    stores?.documentStore ??
    createDocumentStore(createDefaultTacticalProject());
  const sessionStore = stores?.sessionStore ?? createSessionStore();
  const utils = render(
    <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
      {ui}
    </TacticalStoreProvider>,
  );
  return { documentStore, sessionStore, ...utils };
}

describe('PlayerQuickActions - VisionConeAction', () => {
  it('視野コーンがOFF (visible: false または undefined) の時は視野カラーピッカーが表示されないこと', () => {
    const documentStore = createDocumentStore(createDefaultTacticalProject());
    const sessionStore = createSessionStore();
    const { activePhaseId, activeSlideId } = sessionStore.getState();

    const player = {
      ...createDefaultDomainPlayers('#38bdf8')[0],
      id: 'p1',
      visionCone: undefined,
    };
    documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, {
      type: 'ADD_PLAYER',
      player,
    });

    renderWithStore(<VisionConeAction player={player} />, {
      documentStore,
      sessionStore,
    });

    expect(screen.queryByTitle('視野カラー変更')).toBeNull();
  });

  it('視野コーンがON (visible: true) の時に視野カラーピッカーが表示され、色変更時に documentStore が更新されること', () => {
    const project = createDefaultTacticalProject();
    const activePhaseId = project.phases[0].id;
    const activeSlideId = project.phases[0].slides[0].id;
    const documentStore = createDocumentStore(project);
    const sessionStore = createSessionStore({ activePhaseId, activeSlideId });

    const player = {
      ...createDefaultDomainPlayers('#38bdf8')[0],
      id: 'p1',
      visionCone: {
        id: 'vc-1',
        angleRad: 0,
        spreadRad: (60 * Math.PI) / 180,
        radius: 13,
        color: '#38bdf8',
        opacity: 0.3,
        visible: true,
      },
    };
    documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, {
      type: 'ADD_PLAYER',
      player,
    });

    renderWithStore(<VisionConeAction player={player} />, {
      documentStore,
      sessionStore,
    });

    const colorPickerTrigger = screen.getByTitle('視野カラー変更');
    expect(colorPickerTrigger).toBeDefined();

    // MiniColorPicker パレットを開く
    fireEvent.click(colorPickerTrigger);

    // パレット内の #ef4444 ボタンをクリック
    const redColorBtn = screen.getByTitle('#ef4444');
    expect(redColorBtn).toBeDefined();
    fireEvent.click(redColorBtn);

    // ストアのマーカーの visionCone.color が更新されたことを検証
    const slide = selectDomainActiveSlide(
      documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
    const updatedPlayer = slide?.players.find((m) => m.id === 'p1');
    expect(updatedPlayer?.area).toBe('pitch');
    if (updatedPlayer?.area === 'pitch') {
      expect(updatedPlayer.visionCone?.color).toBe('#ef4444');
    }
  });
});
