import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalAnimationStore } from '../tactical-animation-store';

describe('tactical-animation-store', () => {
  beforeEach(() => {
    useTacticalAnimationStore.getState().resetScenes();
  });

  it('handles multi-selection and toggle selection correctly', () => {
    const store = useTacticalAnimationStore.getState();

    // 初期状態
    expect(store.selectedPlayerId).toBeNull();
    expect(store.selectedPlayerIds).toEqual([]);

    // 単一選択
    store.setSelectedPlayerId('player-1');
    expect(useTacticalAnimationStore.getState().selectedPlayerId).toBe(
      'player-1',
    );
    expect(useTacticalAnimationStore.getState().selectedPlayerIds).toEqual([
      'player-1',
    ]);

    // 複数選択
    store.setSelectedPlayerIds(['player-1', 'player-2', 'player-3']);
    expect(useTacticalAnimationStore.getState().selectedPlayerIds).toEqual([
      'player-1',
      'player-2',
      'player-3',
    ]);

    // トグル選択 (Shift+Click 想定: 追加)
    store.toggleSelectPlayerId('player-4', true);
    expect(useTacticalAnimationStore.getState().selectedPlayerIds).toContain(
      'player-4',
    );
    expect(useTacticalAnimationStore.getState().selectedPlayerIds.length).toBe(
      4,
    );

    // トグル選択 (Shift+Click 想定: 削除)
    store.toggleSelectPlayerId('player-2', true);
    expect(
      useTacticalAnimationStore.getState().selectedPlayerIds,
    ).not.toContain('player-2');
    expect(useTacticalAnimationStore.getState().selectedPlayerIds.length).toBe(
      3,
    );

    // 選択クリア
    store.clearSelection();
    expect(useTacticalAnimationStore.getState().selectedPlayerId).toBeNull();
    expect(useTacticalAnimationStore.getState().selectedPlayerIds).toEqual([]);
  });

  it('updates marker sizeScale individually and in batch', () => {
    const store = useTacticalAnimationStore.getState();

    // モック選手を配置
    useTacticalAnimationStore.setState({
      scenes: [
        {
          id: 'scene-1',
          durationMs: 1500,
          pauseMs: 500,
          players: {
            '1': {
              playerId: '1',
              name: 'Player 1',
              shirtNo: '1',
              x: 50,
              y: 80,
              team: 'home',
              area: 'pitch',
              options: {
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#3b82f6',
                sizeScale: 1.0,
              },
            },
            '2': {
              playerId: '2',
              name: 'Player 2',
              shirtNo: '2',
              x: 40,
              y: 60,
              team: 'home',
              area: 'pitch',
              options: {
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#3b82f6',
                sizeScale: 1.0,
              },
            },
          },
          ballPos: { x: 50, y: 50 },
        },
      ],
    });

    // 複数選手サイズ更新
    store.updateMultiplePlayersOptions(['1', '2'], { sizeScale: 1.25 });
    const scene = useTacticalAnimationStore.getState().scenes[0];
    expect(scene.players['1'].options.sizeScale).toBe(1.25);
    expect(scene.players['2'].options.sizeScale).toBe(1.25);

    // 全選手一括更新
    store.updateAllPlayersOptions({ sizeScale: 0.85 });
    const updatedScene = useTacticalAnimationStore.getState().scenes[0];
    expect(updatedScene.players['1'].options.sizeScale).toBe(0.85);
    expect(updatedScene.players['2'].options.sizeScale).toBe(0.85);
  });

  it('applies formation positions to pitch players', () => {
    const store = useTacticalAnimationStore.getState();

    // 11人の選手を作成
    const mockPlayers: Record<string, any> = {};
    for (let i = 1; i <= 11; i++) {
      mockPlayers[i.toString()] = {
        playerId: i.toString(),
        name: `Player ${i}`,
        shirtNo: i.toString(),
        x: 10 * i,
        y: 10 * i,
        team: 'home',
        area: 'pitch',
        options: {
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#3b82f6',
        },
      };
    }

    useTacticalAnimationStore.setState({
      orientation: 'vertical',
      scenes: [
        {
          id: 'scene-1',
          durationMs: 1500,
          pauseMs: 500,
          players: mockPlayers,
          ballPos: { x: 50, y: 50 },
        },
      ],
    });

    // 4-4-2 フォーメーションを適用
    store.applyFormation(0, 'home', '4-4-2', 'half');

    const scene = useTacticalAnimationStore.getState().scenes[0];
    const player1 = scene.players['1'];
    // 縦画面・ハーフコートの場合のGK位置
    expect(player1.x).toBeDefined();
    expect(player1.y).toBeGreaterThanOrEqual(50); // 自陣下半分
  });

  it('moves multiple selected players by delta concurrently', () => {
    const store = useTacticalAnimationStore.getState();

    useTacticalAnimationStore.setState({
      scenes: [
        {
          id: 'scene-1',
          durationMs: 1500,
          pauseMs: 500,
          players: {
            '1': {
              playerId: '1',
              name: 'P1',
              shirtNo: '1',
              x: 20,
              y: 30,
              team: 'home',
              area: 'pitch',
              options: {
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#3b82f6',
              },
            },
            '2': {
              playerId: '2',
              name: 'P2',
              shirtNo: '2',
              x: 40,
              y: 50,
              team: 'home',
              area: 'pitch',
              options: {
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#3b82f6',
              },
            },
          },
          ballPos: { x: 50, y: 50 },
        },
      ],
    });

    // deltaX = +10, deltaY = -5 で2選手を連動移動
    store.moveMultiplePlayersByDelta(0, ['1', '2'], 10, -5);

    const scene = useTacticalAnimationStore.getState().scenes[0];
    expect(scene.players['1'].x).toBe(30);
    expect(scene.players['1'].y).toBe(25);
    expect(scene.players['2'].x).toBe(50);
    expect(scene.players['2'].y).toBe(45);
  });

  it('transforms player and ball coordinates when toggling orientation', () => {
    const store = useTacticalAnimationStore.getState();

    // 横画面で Home GK (10, 50), Away GK (90, 50), Ball (50, 50)
    useTacticalAnimationStore.setState({
      orientation: 'horizontal',
      scenes: [
        {
          id: 'scene-1',
          durationMs: 1500,
          pauseMs: 500,
          players: {
            'home-gk': {
              playerId: 'home-gk',
              name: 'Home GK',
              shirtNo: '1',
              x: 10,
              y: 50,
              team: 'home',
              area: 'pitch',
              options: {
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#3b82f6',
              },
            },
            'away-gk': {
              playerId: 'away-gk',
              name: 'Away GK',
              shirtNo: '1',
              x: 90,
              y: 50,
              team: 'away',
              area: 'pitch',
              options: {
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#ef4444',
              },
            },
            'bench-p': {
              playerId: 'bench-p',
              name: 'Sub',
              shirtNo: '12',
              x: 15,
              y: 10,
              team: 'home',
              area: 'bench',
              options: {
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#3b82f6',
              },
            },
          },
          ballPos: { x: 30, y: 70 },
        },
      ],
    });

    // 横 -> 縦 に切り替え
    store.setOrientation('vertical');

    let scene = useTacticalAnimationStore.getState().scenes[0];
    // x_v = y_h, y_v = 100 - x_h
    expect(scene.players['home-gk'].x).toBe(50);
    expect(scene.players['home-gk'].y).toBe(90); // 100 - 10
    expect(scene.players['away-gk'].x).toBe(50);
    expect(scene.players['away-gk'].y).toBe(10); // 100 - 90
    // ベンチ選手は座標維持
    expect(scene.players['bench-p'].x).toBe(15);
    expect(scene.players['bench-p'].y).toBe(10);
    // ボール: x_v = 70, y_v = 100 - 30 = 70
    expect(scene.ballPos.x).toBe(70);
    expect(scene.ballPos.y).toBe(70);

    // 縦 -> 横 に戻す
    store.setOrientation('horizontal');

    scene = useTacticalAnimationStore.getState().scenes[0];
    // x_h = 100 - y_v, y_h = x_v
    expect(scene.players['home-gk'].x).toBe(10);
    expect(scene.players['home-gk'].y).toBe(50);
    expect(scene.players['away-gk'].x).toBe(90);
    expect(scene.players['away-gk'].y).toBe(50);
    expect(scene.ballPos.x).toBe(30);
    expect(scene.ballPos.y).toBe(70);
  });

  describe('importFromTacticalBoard', () => {
    const mockMatch = {
      id: 'chelsea-tactics-board',
      teams: {
        home: {
          teamId: 15,
          name: 'Chelsea',
          players: [{ playerId: 1, name: 'Robert Sánchez', shirtNo: 1 }],
        },
        away: {
          teamId: 9999,
          name: 'Opponent',
          players: [{ playerId: 2, name: 'Away GK', shirtNo: 1 }],
        },
      },
    };

    const savedSettings = {
      1: {
        playerId: 1,
        shirtNo: '1',
        x: 10,
        y: 50,
        team: 'home' as const,
        area: 'pitch' as const,
      },
      2: {
        playerId: 2,
        shirtNo: '1',
        x: 90,
        y: 50,
        team: 'away' as const,
        area: 'pitch' as const,
      },
    };

    const ballPos = { x: 50, y: 50 };

    it('imports correctly when animation orientation is horizontal (no rotation)', () => {
      const store = useTacticalAnimationStore.getState();
      useTacticalAnimationStore.setState({ orientation: 'horizontal' });

      store.importFromTacticalBoard(
        savedSettings,
        ballPos,
        mockMatch as any,
        false,
      );

      const scene = useTacticalAnimationStore.getState().scenes[0];
      expect(scene.players['1'].x).toBe(10);
      expect(scene.players['1'].y).toBe(50);
      expect(scene.players['2'].x).toBe(90);
      expect(scene.players['2'].y).toBe(50);
      expect(scene.ballPos.x).toBe(50);
      expect(scene.ballPos.y).toBe(50);
    });

    it('transforms coordinates correctly when animation orientation is vertical (rotates 90 deg)', () => {
      const store = useTacticalAnimationStore.getState();
      useTacticalAnimationStore.setState({ orientation: 'vertical' });

      store.importFromTacticalBoard(
        savedSettings,
        ballPos,
        mockMatch as any,
        false,
      );

      const scene = useTacticalAnimationStore.getState().scenes[0];
      // x_v = y_h, y_v = 100 - x_h
      expect(scene.players['1'].x).toBe(50);
      expect(scene.players['1'].y).toBe(90); // 100 - 10
      expect(scene.players['2'].x).toBe(50);
      expect(scene.players['2'].y).toBe(10); // 100 - 90
      expect(scene.ballPos.x).toBe(50);
      expect(scene.ballPos.y).toBe(50);
    });
  });
});
