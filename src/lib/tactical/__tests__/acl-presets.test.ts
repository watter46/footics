import { describe, expect, it } from 'vitest';
import {
  buildFormationPlacements,
  buildPlacementsFromPreset,
} from '@/lib/tactical/acl/formation-placements';
import {
  applyFormationPlacementsToSlide,
  applySingleTeamFormationToSlide,
  type FormationPlacement,
} from '@/lib/tactical/acl/formation-translator';
import {
  type SquadMemberInput,
  translateSquadToDomainPlayers,
} from '@/lib/tactical/acl/match-squad-translator';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

describe('Formation Translator ACL', () => {
  it('applyFormationPlacementsToSlide: applies placements to team players and sends excess to bench', () => {
    const initialSlide: DomainSlide = {
      id: 'slide-1',
      index: 0,
      players: [
        {
          id: 'p-1',
          playerId: 'p-1',
          name: 'Player 1',
          shirtNo: '1',
          position: 'GK',
          team: 'home',
          area: 'pitch',
          x: toScreenNormPoint(20, 20).x,
          y: toScreenNormPoint(20, 20).y,
          style: {
            markerType: 'circle',
            insideContent: 'number',
            bottomLabel: 'name',
            color: '#034694',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            sizeScale: 1,
            numberSizeScale: 1,
            labelSizeScale: 1,
          },
          connectLines: [],
          badges: [],
        },
        {
          id: 'p-2',
          playerId: 'p-2',
          name: 'Player 2',
          shirtNo: '2',
          position: 'DF',
          team: 'home',
          area: 'pitch',
          x: toScreenNormPoint(30, 30).x,
          y: toScreenNormPoint(30, 30).y,
          style: {
            markerType: 'circle',
            insideContent: 'number',
            bottomLabel: 'name',
            color: '#034694',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            sizeScale: 1,
            numberSizeScale: 1,
            labelSizeScale: 1,
          },
          connectLines: [],
          badges: [],
        },
        {
          id: 'away-1',
          playerId: 'away-1',
          name: 'Away 1',
          shirtNo: '9',
          position: 'FW',
          team: 'away',
          area: 'pitch',
          x: toScreenNormPoint(70, 50).x,
          y: toScreenNormPoint(70, 50).y,
          style: {
            markerType: 'circle',
            insideContent: 'number',
            bottomLabel: 'name',
            color: '#ef4444',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            sizeScale: 1,
            numberSizeScale: 1,
            labelSizeScale: 1,
          },
          connectLines: [],
          badges: [],
        },
      ],
      arrows: [],
      zones: [],
      texts: [],
      ball: {
        x: toScreenNormPoint(50, 50).x,
        y: toScreenNormPoint(50, 50).y,
        visible: true,
      },
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'ease-in-out',
    };

    // Apply placements with only 1 slot
    const slots: FormationPlacement[] = [
      {
        shirtNo: '1',
        position: 'GK',
        x: toScreenNormPoint(10, 50).x,
        y: toScreenNormPoint(10, 50).y,
      },
    ];

    const nextSlide = applyFormationPlacementsToSlide(
      initialSlide,
      slots,
      'home',
      (team, i) => `new-${team}-${i}`,
    );

    // Away player must be untouched
    const awayPlayer = nextSlide.players.find((p) => p.id === 'away-1');
    expect(awayPlayer).toBeDefined();
    expect(awayPlayer?.area).toBe('pitch');

    // Home players: p-1 is on pitch at projected point, p-2 moved to bench
    const homePitch = nextSlide.players.filter(
      (p): p is PitchPlayer => p.team === 'home' && p.area === 'pitch',
    );
    const homeBench = nextSlide.players.filter(
      (p) => p.team === 'home' && p.area === 'bench',
    );

    expect(homePitch).toHaveLength(1);
    expect(homePitch[0].id).toBe('p-1');
    expect(homePitch[0].x).toBeCloseTo(10);
    expect(homePitch[0].y).toBeCloseTo(50);

    expect(homeBench).toHaveLength(1);
    expect(homeBench[0].id).toBe('p-2');
    expect('connectLines' in homeBench[0]).toBe(false);
  });
});

describe('Match Squad Translator ACL', () => {
  it('translateSquadToDomainPlayers: separates starters onto pitch and subs to bench without pitch fields', () => {
    const squad: SquadMemberInput[] = [
      {
        playerId: 's-1',
        name: 'Starter Player',
        shirtNo: '7',
        position: 'RW',
        isStarter: true,
        pitchPoint: toScreenNormPoint(40, 60),
      },
      {
        playerId: 'b-1',
        name: 'Bench Player',
        shirtNo: '12',
        position: 'SUB',
        isStarter: false,
      },
    ];

    const players = translateSquadToDomainPlayers(squad, 'home', '#034694');

    expect(players).toHaveLength(2);

    const starter = players.find((p) => p.id === 's-1');
    expect(starter).toBeDefined();
    expect(starter?.area).toBe('pitch');
    if (starter?.area === 'pitch') {
      expect(starter.x).toBeCloseTo(40);
      expect(starter.y).toBeCloseTo(60);
      expect(starter.team).toBe('home');
      expect(starter.style.color).toBe('#034694');
      expect(starter.connectLines).toEqual([]);
      expect(starter.badges).toEqual([]);
    }

    const sub = players.find((p) => p.id === 'b-1');
    expect(sub).toBeDefined();
    expect(sub?.area).toBe('bench');
    expect('connectLines' in (sub ?? {})).toBe(false);
    expect('badges' in (sub ?? {})).toBe(false);
    expect('visionCone' in (sub ?? {})).toBe(false);
    expect(sub?.team).toBe('home');
    expect(sub?.style.color).toBe('#034694');
  });
});

describe('Formation Placements ACL', () => {
  it('buildFormationPlacements: 4-3-3 は 11 人分・GK は自陣ゴール前に固定される', () => {
    const home = buildFormationPlacements('4-3-3', 'home', 'full', {
      aspectRatio: '16:9',
    });
    expect(home).toHaveLength(11);
    expect(home[0].position).toBe('GK');
    expect(home[0].x).toBeCloseTo(7);
    const away = buildFormationPlacements('4-3-3', 'away', 'full', {
      aspectRatio: '16:9',
    });
    expect(away[0].x).toBeCloseTo(93);
  });

  it('buildFormationPlacements: サイド入れ替え時は座標が反転する', () => {
    const swapped = buildFormationPlacements('4-3-3', 'home', 'full', {
      aspectRatio: '16:9',
      isSidesSwapped: true,
    });
    expect(swapped[0].x).toBeCloseTo(93);
    expect(swapped[0].y).toBeCloseTo(50);
  });

  it('buildPlacementsFromPreset: 横画面ではそのまま、範囲外は丸められる', () => {
    const placed = buildPlacementsFromPreset(
      [{ shirtNo: '9', position: 'ST', x: 120, y: 40 }],
      '16:9',
    );
    expect(placed[0].x).toBe(115);
    expect(placed[0].y).toBe(40);
  });
});

describe('applySingleTeamFormationToSlide', () => {
  it('相手チームは全員ベンチへ、自チームは配置どおりピッチへ', () => {
    const awayPlayer: PitchPlayer = {
      id: 'away-1',
      team: 'away',
      area: 'pitch',
      x: toScreenNormPoint(70, 50).x,
      y: toScreenNormPoint(70, 50).y,
      style: {
        markerType: 'circle',
        insideContent: 'number',
        bottomLabel: 'name',
        color: '#ef4444',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
      connectLines: [],
      badges: [],
    };
    const slide: DomainSlide = {
      id: 's',
      index: 0,
      players: [awayPlayer],
      arrows: [],
      zones: [],
      texts: [],
      ball: {
        x: toScreenNormPoint(50, 50).x,
        y: toScreenNormPoint(50, 50).y,
        visible: true,
      },
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'linear',
    };
    const placements = buildFormationPlacements('4-4-2', 'home', 'full', {
      aspectRatio: '16:9',
    });
    const next = applySingleTeamFormationToSlide(
      slide,
      placements,
      'home',
      (team, i) => `new-${team}-${i}`,
    );
    expect(next.players.find((p) => p.id === 'away-1')?.area).toBe('bench');
    expect(
      next.players.filter((p) => p.team === 'home' && p.area === 'pitch'),
    ).toHaveLength(11);
  });
});
