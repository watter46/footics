import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { EffectInspectorPanel } from '@/features/tactical-unified/panels/right-panel/effect-inspector-panel';
import type { SessionStoreState } from '@/features/tactical-unified/stores/session-store';
import {
  TacticalStoreProvider,
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';

interface StoreApi {
  getProject: () => DomainTacticalProject;
  selectObject: SessionStoreState['selectObject'];
}

function StoreObserver({ onReady }: { onReady: (api: StoreApi) => void }) {
  const project = useDocumentStore((s) => s.project);
  const selectObject = useSessionStore((s) => s.selectObject);
  useEffect(() => {
    onReady({ getProject: () => project, selectObject });
  }, [onReady, project, selectObject]);
  return null;
}

describe('Ball & Player Trajectory Effect Inspector', () => {
  it('case 1: 選手選択時、軌道エフェクトを ON にして色を変更すると player.trajectoryEffect.color がストアに保存されること', () => {
    const apiRef: { current: StoreApi | null } = { current: null };

    render(
      <TacticalStoreProvider>
        <StoreObserver
          onReady={(api) => {
            apiRef.current = api;
          }}
        />
        <EffectInspectorPanel />
      </TacticalStoreProvider>,
    );

    const firstPitchPlayer = apiRef.current
      ?.getProject()
      .phases[0].slides[0].players.find((p) => p.area === 'pitch');
    expect(firstPitchPlayer).toBeDefined();

    if (firstPitchPlayer) {
      act(() => {
        apiRef.current?.selectObject({
          kind: 'player',
          id: firstPitchPlayer.id,
        });
      });
    }

    const onButtons = screen.getAllByRole('radio', { name: 'ON' });
    fireEvent.click(onButtons[onButtons.length - 1]);

    // ColorInput のパレットから #3b82f6 (Blue) を選択
    fireEvent.click(screen.getByTitle('#3b82f6'));

    const updatedPlayer = apiRef.current
      ?.getProject()
      .phases[0].slides[0].players.find(
        (p) => p.area === 'pitch' && p.id === firstPitchPlayer?.id,
      );
    expect(updatedPlayer?.area).toBe('pitch');
    if (updatedPlayer?.area !== 'pitch') {
      throw new Error('Expected pitch player');
    }
    expect(updatedPlayer.trajectoryEffect?.enabled).toBe(true);
    expect(updatedPlayer.trajectoryEffect?.color).toBe('#3b82f6');
  });

  it('case 2: ボール選択時、エフェクト設定パネルが表示され、初期状態が OFF であること', () => {
    const apiRef: { current: StoreApi | null } = { current: null };

    render(
      <TacticalStoreProvider>
        <StoreObserver
          onReady={(api) => {
            apiRef.current = api;
          }}
        />
        <EffectInspectorPanel />
      </TacticalStoreProvider>,
    );

    act(() => {
      apiRef.current?.selectObject({ kind: 'ball', id: 'ball' });
    });

    expect(screen.getByTestId('ball-effect-inspector')).toBeTruthy();
    expect(screen.getByText('エフェクト設定 (ボールエフェクト)')).toBeTruthy();
    expect(screen.queryByText('線種 (Line Style)')).toBeNull();
  });

  it('case 3: ボール選択時、軌道エフェクトを ON にして線種・色・到達後動作を変更すると slide.ball.trajectoryEffect が更新されること', () => {
    const apiRef: { current: StoreApi | null } = { current: null };

    render(
      <TacticalStoreProvider>
        <StoreObserver
          onReady={(api) => {
            apiRef.current = api;
          }}
        />
        <EffectInspectorPanel />
      </TacticalStoreProvider>,
    );

    act(() => {
      apiRef.current?.selectObject({ kind: 'ball', id: 'ball' });
    });

    fireEvent.click(screen.getByRole('radio', { name: 'ON' }));
    fireEvent.click(screen.getByRole('radio', { name: '点線 (Dashed)' }));
    fireEvent.click(screen.getByTitle('#06b6d4'));
    fireEvent.click(screen.getByRole('radio', { name: '消去 (Auto-hide)' }));

    const ball = apiRef.current?.getProject().phases[0].slides[0].ball;
    expect(ball?.trajectoryEffect).toEqual({
      enabled: true,
      lineStyle: 'dashed',
      color: '#06b6d4',
      exitAction: 'auto-hide',
    });
  });
});
