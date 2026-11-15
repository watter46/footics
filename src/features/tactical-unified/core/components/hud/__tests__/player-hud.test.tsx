import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { PlayerHud } from '@/features/tactical-unified/core/components/hud/player-hud';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';

function createTestPlayer(
  overrides: Partial<Extract<DomainPlayer, { area: 'pitch' }>> = {},
): DomainPlayer {
  return {
    id: 'p1',
    team: 'home',
    area: 'pitch',
    x: toScreenNormCoord(50),
    y: toScreenNormCoord(50),
    shirtNo: '10',
    name: 'Player 10',
    connectLines: [],
    badges: [],
    style: {
      color: '#38bdf8',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    },
    ...overrides,
  };
}

function renderWithStores(
  ui: React.ReactElement,
  player: DomainPlayer = createTestPlayer(),
) {
  const project = createDefaultTacticalProject();
  const phase = project.phases[0];
  const slide = phase.slides[0];
  const documentStore = createDocumentStore({
    ...project,
    phases: [
      {
        ...phase,
        slides: [
          {
            ...slide,
            players: [player],
          },
        ],
      },
    ],
  });
  const sessionStore = createSessionStore({
    activePhaseId: phase.id,
    activeSlideId: slide.id,
  });

  const utils = render(
    <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
      {ui}
    </TacticalStoreProvider>,
  );

  const getPlayer = () =>
    selectDomainActiveSlide(
      documentStore.getState().project,
      phase.id,
      slide.id,
    )?.players.find((p) => p.id === player.id);

  return { documentStore, sessionStore, getPlayer, ...utils };
}

describe('PlayerHud', () => {
  it('ring-fade マーカーの時に発光幅 (Blur) と発光透明度 (Opacity) の変更ボタンが表示され、クリックで値が増減すること', () => {
    const player = createTestPlayer({
      style: {
        color: '#38bdf8',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        markerType: 'ring-fade',
        insideContent: 'number',
        bottomLabel: 'name',
        sizeScale: 1.0,
        numberSizeScale: 1.0,
        labelSizeScale: 1.0,
        glowBlur: 50,
        glowOpacity: 1.0,
      },
    });
    const { getPlayer } = renderWithStores(<PlayerHud playerId="p1" />, player);

    const blurIncBtn = screen.getByTitle('発光幅拡大');
    const blurDecBtn = screen.getByTitle('発光幅縮小');
    expect(blurIncBtn).toBeDefined();
    expect(blurDecBtn).toBeDefined();

    // 増加テスト: 50 -> 55
    fireEvent.click(blurIncBtn);
    expect(getPlayer()?.style?.glowBlur).toBe(55);

    // 減少テスト: 55 -> 50
    fireEvent.click(blurDecBtn);
    expect(getPlayer()?.style?.glowBlur).toBe(50);

    const opacityIncBtn = screen.getByTitle('発光透明度拡大');
    const opacityDecBtn = screen.getByTitle('発光透明度縮小');
    expect(opacityIncBtn).toBeDefined();
    expect(opacityDecBtn).toBeDefined();

    // 減少テスト: 1.0 -> 0.9
    fireEvent.click(opacityDecBtn);
    expect(getPlayer()?.style?.glowOpacity).toBeCloseTo(0.9);

    // 増加テスト: 0.9 -> 1.0
    fireEvent.click(opacityIncBtn);
    expect(getPlayer()?.style?.glowOpacity).toBeCloseTo(1.0);
  });

  it('ロックボタンと削除ボタンが documentStore にコマンドをディスパッチすること', () => {
    const player = createTestPlayer({
      isCustom: true,
      locked: false,
    });
    const { getPlayer, sessionStore } = renderWithStores(
      <PlayerHud playerId="p1" />,
      player,
    );

    const lockBtn = screen.getByTitle('ロック (固定)');
    fireEvent.click(lockBtn);
    expect(getPlayer()?.locked).toBe(true);

    const unlockBtn = screen.getByTitle('ロック解除');
    fireEvent.click(unlockBtn);
    expect(getPlayer()?.locked).toBe(false);

    const deleteBtn = screen.getByTitle('削除 (Delete)');
    fireEvent.click(deleteBtn);
    expect(getPlayer()).toBeUndefined();
    expect(sessionStore.getState().selectedObjects).toEqual([]);
  });

  it('サークルマーカー描画時でもインライン背番号 input が HUD 上に存在しないこと (コンパクト化)', () => {
    renderWithStores(<PlayerHud playerId="p1" />);

    expect(screen.queryByRole('textbox', { name: '背番号' })).toBeNull();
    expect(screen.queryByLabelText('背番号')).toBeNull();
  });
});
