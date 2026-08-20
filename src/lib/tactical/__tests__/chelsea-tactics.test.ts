import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';
import { useTacticalStore } from '@/stores/tactical-store';
import type { Match } from '@/types';
import {
  AVAILABLE_SEASONS,
  CHELSEA_PRESET_SQUAD,
  CHELSEA_PRESETS_BY_SEASON,
  DEFAULT_OPPONENT_SQUAD,
} from '../chelsea-preset';

describe('chelsea-preset and tactical animation bridge', () => {
  beforeEach(() => {
    useTacticalAnimationStore.getState().resetScenes();
    useTacticalStore.getState().resetTactical();
  });

  it('contains valid Chelsea preset squad and Opponent squad for each season', () => {
    expect(CHELSEA_PRESET_SQUAD.length).toBeGreaterThan(15);
    const palmer = CHELSEA_PRESET_SQUAD.find((p) => p.name.includes('Palmer'));
    expect(palmer).toBeDefined();
    expect(palmer?.shirtNo).toBe(20);

    // 全シーズン (26-27, 25-26, 24-25) の検証
    AVAILABLE_SEASONS.forEach((season) => {
      const squad = CHELSEA_PRESETS_BY_SEASON[season];
      expect(squad.length).toBeGreaterThan(15);
      const gk = squad.find((p) => p.position === 'GK');
      expect(gk).toBeDefined();
    });

    expect(DEFAULT_OPPONENT_SQUAD.length).toBe(15);
    expect(DEFAULT_OPPONENT_SQUAD.filter((p) => p.isFirstEleven).length).toBe(
      11,
    );
  });

  it('supports tactical store orientation switching and coordinate transformation', () => {
    const store = useTacticalStore.getState();
    expect(store.orientation).toBe('horizontal');

    // ピッチ選手を配置 (横画面: x: 80, y: 30)
    store.setSavedSettings({
      345001: {
        playerId: 345001,
        shirtNo: '1',
        x: 80,
        y: 30,
        team: 'home',
        area: 'pitch',
      },
      345002: {
        playerId: 345002,
        shirtNo: '12',
        x: 10,
        y: 10,
        team: 'home',
        area: 'bench',
      },
    });
    store.setBallPos({ x: 70, y: 40 });

    // 縦画面に切り替え
    useTacticalStore.getState().setOrientation('vertical');
    const verticalSettings = useTacticalStore.getState().savedSettings;
    const verticalBall = useTacticalStore.getState().ballPos;

    expect(useTacticalStore.getState().orientation).toBe('vertical');
    // 横 -> 縦: x_v = y_h = 30, y_v = 100 - x_h = 20
    expect(verticalSettings[345001].x).toBe(30);
    expect(verticalSettings[345001].y).toBe(20);
    // ベンチ選手は座標不変
    expect(verticalSettings[345002].x).toBe(10);
    expect(verticalSettings[345002].y).toBe(10);
    // ボール: x_v = 40, y_v = 100 - 70 = 30
    expect(verticalBall.x).toBe(40);
    expect(verticalBall.y).toBe(30);

    // 再び横画面に戻す
    useTacticalStore.getState().setOrientation('horizontal');
    const horizontalSettings = useTacticalStore.getState().savedSettings;
    const horizontalBall = useTacticalStore.getState().ballPos;

    expect(useTacticalStore.getState().orientation).toBe('horizontal');
    // 縦 -> 横: x_h = 100 - 20 = 80, y_h = 30
    expect(horizontalSettings[345001].x).toBe(80);
    expect(horizontalSettings[345001].y).toBe(30);
    expect(horizontalBall.x).toBe(70);
    expect(horizontalBall.y).toBe(40);
  });

  it('imports tactical board settings to animation store correctly in horizontal mode', () => {
    const mockMatch: Match = {
      id: 'chelsea-tactics-board',
      date: '2026-08-19',
      score: '0 - 0',
      matchType: 'club',
      homeTeam: { id: 15, name: 'Chelsea' },
      awayTeam: { id: 9999, name: 'Opponent' },
      playerIdNameDictionary: {
        345014: 'Cole Palmer',
        999001: 'Away GK',
      },
      teams: {
        home: {
          teamId: 15,
          name: 'Chelsea',
          countryName: 'England',
          managerName: 'Enzo Maresca',
          field: 'home',
          averageAge: 23.5,
          players: [],
          formations: [],
          stats: {},
        },
        away: {
          teamId: 9999,
          name: 'Opponent',
          countryName: 'Opponent',
          managerName: 'Manager',
          field: 'away',
          averageAge: 25.0,
          players: [],
          formations: [],
          stats: {},
        },
      },
    };

    const savedSettings = {
      345014: {
        playerId: 345014,
        shirtNo: '20',
        x: 45,
        y: 65,
        team: 'home' as const,
        area: 'pitch' as const,
      },
      999001: {
        playerId: 999001,
        shirtNo: '1',
        x: 50,
        y: 10,
        team: 'away' as const,
        area: 'pitch' as const,
      },
    };

    const ballPos = { x: 45, y: 64 };

    useTacticalAnimationStore.setState({ orientation: 'horizontal' });
    useTacticalAnimationStore
      .getState()
      .importFromTacticalBoard(savedSettings, ballPos, mockMatch);

    const store = useTacticalAnimationStore.getState();
    expect(store.scenes.length).toBe(1);
    const scene = store.scenes[0];

    expect(scene.players['345014']).toBeDefined();
    expect(scene.players['345014'].name).toBe('Cole Palmer');
    expect(scene.players['345014'].x).toBe(45);
    expect(scene.players['345014'].y).toBe(65);
    expect(scene.players['345014'].team).toBe('home');

    expect(scene.players['999001']).toBeDefined();
    expect(scene.players['999001'].name).toBe('Away GK');
    expect(scene.ballPos).toEqual({ x: 45, y: 64 });
  });
});
