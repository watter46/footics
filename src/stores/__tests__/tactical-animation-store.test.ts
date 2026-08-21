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

  it('updates marker strokeColor and strokeWidth individually, by team, and in batch', () => {
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
                strokeColor: '#ffffff',
                strokeWidth: 2,
              },
            },
            '2': {
              playerId: '2',
              name: 'Player 2',
              shirtNo: '2',
              x: 40,
              y: 60,
              team: 'away',
              area: 'pitch',
              options: {
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#ef4444',
                strokeColor: '#ffffff',
                strokeWidth: 2,
              },
            },
          },
          ballPos: { x: 50, y: 50 },
        },
      ],
    });

    // 1. 個別変更: 枠線なし (strokeWidth: 0)
    store.updatePlayerOptions('1', { strokeWidth: 0 });
    let scene = useTacticalAnimationStore.getState().scenes[0];
    expect(scene.players['1'].options.strokeWidth).toBe(0);

    // 2. チーム別変更: HOMEの枠線をゴールド (#fbbf24)・太さ 3.5 に
    store.updateTeamOptions('home', {
      strokeColor: '#fbbf24',
      strokeWidth: 3.5,
    });
    scene = useTacticalAnimationStore.getState().scenes[0];
    expect(scene.players['1'].options.strokeColor).toBe('#fbbf24');
    expect(scene.players['1'].options.strokeWidth).toBe(3.5);
    expect(scene.players['2'].options.strokeColor).toBe('#ffffff');

    // 3. 全体一括変更: 枠線黒 (#0f172a)・太さ 1 に
    store.updateAllPlayersOptions({ strokeColor: '#0f172a', strokeWidth: 1 });
    scene = useTacticalAnimationStore.getState().scenes[0];
    expect(scene.players['1'].options.strokeColor).toBe('#0f172a');
    expect(scene.players['1'].options.strokeWidth).toBe(1);
    expect(scene.players['2'].options.strokeColor).toBe('#0f172a');
    expect(scene.players['2'].options.strokeWidth).toBe(1);

    // 4. 背番号サイズおよび下部ラベルサイズの調整テスト
    store.updatePlayerOptions('1', {
      numberSizeScale: 1.3,
      labelSizeScale: 0.85,
    });
    scene = useTacticalAnimationStore.getState().scenes[0];
    expect(scene.players['1'].options.numberSizeScale).toBe(1.3);
    expect(scene.players['1'].options.labelSizeScale).toBe(0.85);

    store.updateTeamOptions('home', { numberSizeScale: 1.1 });
    scene = useTacticalAnimationStore.getState().scenes[0];
    expect(scene.players['1'].options.numberSizeScale).toBe(1.1);

    store.updateAllPlayersOptions({ labelSizeScale: 1.25 });
    scene = useTacticalAnimationStore.getState().scenes[0];
    expect(scene.players['1'].options.labelSizeScale).toBe(1.25);
    expect(scene.players['2'].options.labelSizeScale).toBe(1.25);
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

    it('imports from match preserving player positions and vertical layout', () => {
      const store = useTacticalAnimationStore.getState();
      useTacticalAnimationStore.setState({ orientation: 'vertical' });

      const fullMockMatch = {
        teams: {
          home: {
            name: 'Chelsea',
            formations: [
              {
                formationName: '4-4-2',
                playerIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
              },
            ],
            players: [
              {
                playerId: 1,
                name: 'Robert Sanchez',
                position: 'GK',
                isFirstEleven: true,
                shirtNo: 1,
              },
              {
                playerId: 2,
                name: 'Marc Cucurella',
                position: 'DL',
                isFirstEleven: true,
                shirtNo: 3,
              },
              {
                playerId: 3,
                name: 'Levi Colwill',
                position: 'DC',
                isFirstEleven: true,
                shirtNo: 6,
              },
              {
                playerId: 4,
                name: 'Wesley Fofana',
                position: 'DC',
                isFirstEleven: true,
                shirtNo: 29,
              },
              {
                playerId: 5,
                name: 'Malo Gusto',
                position: 'DR',
                isFirstEleven: true,
                shirtNo: 27,
              },
              {
                playerId: 6,
                name: 'Enzo Fernandez',
                position: 'MC',
                isFirstEleven: true,
                shirtNo: 8,
              },
              {
                playerId: 7,
                name: 'Moises Caicedo',
                position: 'DMC',
                isFirstEleven: true,
                shirtNo: 25,
              },
              {
                playerId: 8,
                name: 'Jadon Sancho',
                position: 'AML',
                isFirstEleven: true,
                shirtNo: 19,
              },
              {
                playerId: 9,
                name: 'Noni Madueke',
                position: 'AMR',
                isFirstEleven: true,
                shirtNo: 11,
              },
              {
                playerId: 10,
                name: 'Cole Palmer',
                position: 'AMC',
                isFirstEleven: true,
                shirtNo: 20,
              },
              {
                playerId: 11,
                name: 'Nicolas Jackson',
                position: 'FW',
                isFirstEleven: true,
                shirtNo: 15,
              },
              {
                playerId: 12,
                name: 'Filip Jorgensen',
                position: 'GK',
                isFirstEleven: false,
                shirtNo: 12,
              },
              {
                playerId: 13,
                name: 'Benoit Badiashile',
                position: 'DC',
                isFirstEleven: false,
                shirtNo: 5,
              },
            ],
          },
          away: {
            name: 'Arsenal',
            formations: [{ formationName: '4-4-2', playerIds: [] }],
            players: [],
          },
        },
      };

      store.importFromMatch(fullMockMatch as any);

      const scene = useTacticalAnimationStore.getState().scenes[0];
      expect(scene.players['1']).toBeDefined();
      expect(scene.players['1'].position).toBe('GK');
      // GK in vertical mode is near bottom (y > 80)
      expect(scene.players['1'].y).toBeGreaterThan(80);
      expect(scene.players['1'].area).toBe('pitch');

      // Bench player
      expect(scene.players['12']).toBeDefined();
      expect(scene.players['12'].position).toBe('GK');
      expect(scene.players['12'].area).toBe('bench');
    });

    it('toggles orientation smoothly transforming existing scene coordinates', () => {
      const store = useTacticalAnimationStore.getState();
      useTacticalAnimationStore.setState({
        orientation: 'vertical',
        scenes: [
          {
            id: 'scene-1',
            durationMs: 1500,
            pauseMs: 500,
            players: {
              '1': {
                playerId: '1',
                name: 'GK',
                shirtNo: '1',
                position: 'GK',
                x: 50,
                y: 90, // Bottom center
                team: 'home',
                area: 'pitch',
                options: {
                  insideContent: 'number',
                  bottomLabel: 'name',
                  color: '#3b82f6',
                },
              },
            },
            ballPos: { x: 50, y: 70 },
          },
        ],
      });

      // Switch to horizontal: x_h = 100 - y_v, y_h = x_v
      store.setOrientation('horizontal');
      let scene = useTacticalAnimationStore.getState().scenes[0];
      expect(scene.players['1'].x).toBe(10); // 100 - 90
      expect(scene.players['1'].y).toBe(50);
      expect(scene.ballPos.x).toBe(30); // 100 - 70
      expect(scene.ballPos.y).toBe(50);

      // Switch back to vertical: x_v = y_h, y_v = 100 - x_h
      store.setOrientation('vertical');
      scene = useTacticalAnimationStore.getState().scenes[0];
      expect(scene.players['1'].x).toBe(50);
      expect(scene.players['1'].y).toBe(90); // 100 - 10
      expect(scene.ballPos.x).toBe(50);
      expect(scene.ballPos.y).toBe(70);
    });

    it('defaults to strokeWidth 0 and strokeColor none', () => {
      const store = useTacticalAnimationStore.getState();
      expect(store.defaultHomeOptions.strokeWidth).toBe(0);
      expect(store.defaultHomeOptions.strokeColor).toBe('none');
      expect(store.defaultAwayOptions.strokeWidth).toBe(0);
      expect(store.defaultAwayOptions.strokeColor).toBe('none');
    });

    it('restores initial match on resetScenes instead of clearing', () => {
      const store = useTacticalAnimationStore.getState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sampleMatch: any = {
        id: 'test-match-1',
        teams: {
          home: {
            name: 'Chelsea',
            players: [
              {
                playerId: 1,
                name: 'Sánchez',
                isFirstEleven: true,
                position: 'GK',
                shirtNo: 1,
              },
              {
                playerId: 2,
                name: 'Fofana',
                isFirstEleven: true,
                position: 'DC',
                shirtNo: 29,
              },
            ],
            formations: [{ formationName: '3-4-3', playerIds: [1, 2] }],
          },
          away: {
            name: 'Opponent',
            players: [],
          },
        },
      };

      store.importFromMatch(sampleMatch);
      expect(
        Object.keys(useTacticalAnimationStore.getState().scenes[0].players)
          .length,
      ).toBe(2);

      // Add another scene
      store.addScene();
      expect(useTacticalAnimationStore.getState().scenes.length).toBe(2);

      // Reset scenes
      store.resetScenes();
      const state = useTacticalAnimationStore.getState();
      expect(state.scenes.length).toBe(1);
      expect(Object.keys(state.scenes[0].players).length).toBe(2);
      expect(state.teamVisibility).toBe('both');
    });

    it('toggles teamVisibility between both, home, and away', () => {
      const store = useTacticalAnimationStore.getState();
      expect(store.teamVisibility).toBe('both');

      store.setTeamVisibility('home');
      expect(useTacticalAnimationStore.getState().teamVisibility).toBe('home');

      store.setTeamVisibility('away');
      expect(useTacticalAnimationStore.getState().teamVisibility).toBe('away');

      store.setTeamVisibility('both');
      expect(useTacticalAnimationStore.getState().teamVisibility).toBe('both');
    });

    it('manages exportFps (30 / 60) setting correctly', () => {
      const store = useTacticalAnimationStore.getState();
      expect(store.exportFps).toBe(30);

      store.setExportFps(60);
      expect(useTacticalAnimationStore.getState().exportFps).toBe(60);

      store.setExportFps(30);
      expect(useTacticalAnimationStore.getState().exportFps).toBe(30);
    });

    it('updates ballTrajectory and preserves it across scenes', () => {
      const store = useTacticalAnimationStore.getState();

      useTacticalAnimationStore.setState({
        scenes: [
          {
            id: 'scene-1',
            durationMs: 1500,
            pauseMs: 500,
            players: {},
            ballPos: { x: 50, y: 50 },
          },
          {
            id: 'scene-2',
            durationMs: 1500,
            pauseMs: 500,
            players: {},
            ballPos: { x: 70, y: 30 },
          },
        ],
        activeSceneIndex: 0,
      });

      // Update trajectory on active scene (scene 0)
      store.updateBallTrajectory({
        type: 'arc_right',
        curveOffset: 35,
      });

      let scenes = useTacticalAnimationStore.getState().scenes;
      expect(scenes[0].ballTrajectory).toEqual({
        type: 'arc_right',
        curveOffset: 35,
      });
      expect(scenes[1].ballTrajectory).toBeUndefined();

      // Update custom trajectory with controlPoint
      store.updateBallTrajectory({
        type: 'custom',
        controlPoint: { x: 60, y: 40 },
      });
      scenes = useTacticalAnimationStore.getState().scenes;
      expect(scenes[0].ballTrajectory).toEqual({
        type: 'custom',
        curveOffset: 35,
        controlPoint: { x: 60, y: 40 },
      });

      // Duplicate scene creates new scene with default straight trajectory
      store.duplicateScene(0);
      scenes = useTacticalAnimationStore.getState().scenes;
      expect(scenes.length).toBe(3);
      expect(scenes[1].ballTrajectory).toEqual({
        type: 'straight',
      });
    });
  });
});
