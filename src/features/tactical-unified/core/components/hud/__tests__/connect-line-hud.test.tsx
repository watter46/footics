import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConnectLineHud } from '@/features/tactical-unified/core/components/hud/connect-line-hud';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';

function setupConnectLineTest() {
  const project = createDefaultTacticalProject();
  const phase = project.phases[0];
  const slide = phase.slides[0];
  const basePlayer = slide.players[0];
  if (basePlayer.area !== 'pitch') {
    throw new Error('Expected pitch player');
  }
  const p1 = {
    ...basePlayer,
    id: 'p1',
    connectLines: [
      {
        id: 'cl-1',
        toPlayerId: 'p2',
        lineStyle: 'solid' as const,
        color: '#ffffff',
        strokeWidth: 3,
        glowBlur: 50,
        glowOpacity: 1.0,
        visible: true,
      },
    ],
  };
  const p2 = {
    ...basePlayer,
    id: 'p2',
  };
  slide.players = [p1, p2];

  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phase.id,
    activeSlideId: slide.id,
  });

  render(
    <TacticalStoreProvider stores={{ documentStore, sessionStore }}>
      <ConnectLineHud connectLineId="cl-1" parentPlayerId="p1" />
    </TacticalStoreProvider>,
  );

  const getLine = () => {
    const activeSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phase.id,
      slide.id,
    );
    const player = activeSlide?.players.find(
      (p) => p.id === 'p1' && p.area === 'pitch',
    );
    return player?.area === 'pitch' ? player.connectLines?.[0] : undefined;
  };

  return { documentStore, sessionStore, getLine };
}

describe('ConnectLineHud', () => {
  it('発光幅 (Blur) と発光透明度 (Opacity) の変更ボタンが表示され、クリックで値が増減すること', () => {
    const { getLine } = setupConnectLineTest();

    const blurIncBtn = screen.getByTitle('発光幅拡大');
    const blurDecBtn = screen.getByTitle('発光幅縮小');
    expect(blurIncBtn).toBeDefined();
    expect(blurDecBtn).toBeDefined();

    fireEvent.click(blurIncBtn);
    expect(getLine()?.glowBlur).toBe(55);

    fireEvent.click(blurDecBtn);
    expect(getLine()?.glowBlur).toBe(50);

    const opacityIncBtn = screen.getByTitle('発光透明度拡大');
    const opacityDecBtn = screen.getByTitle('発光透明度縮小');
    expect(opacityIncBtn).toBeDefined();
    expect(opacityDecBtn).toBeDefined();

    fireEvent.click(opacityDecBtn);
    expect(getLine()?.glowOpacity).toBeCloseTo(0.9);

    fireEvent.click(opacityIncBtn);
    expect(getLine()?.glowOpacity).toBeCloseTo(1.0);
  });

  it('色変更・実線/点線切替・削除が documentStore と sessionStore に反映されること', () => {
    const { sessionStore, getLine } = setupConnectLineTest();

    // 実線 -> 点線
    fireEvent.click(screen.getByTitle('実線 (点線に切替)'));
    expect(getLine()?.lineStyle).toBe('dashed');

    // 色変更
    fireEvent.click(screen.getByTitle('コネクトラインの色'));
    fireEvent.click(screen.getByTitle('#ef4444'));
    expect(getLine()?.color).toBe('#ef4444');

    // 削除
    fireEvent.click(screen.getByTitle('削除'));
    expect(getLine()).toBeUndefined();
    expect(sessionStore.getState().selectedObjects).toEqual([]);
  });
});
