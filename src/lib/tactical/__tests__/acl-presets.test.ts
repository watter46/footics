import { describe, expect, it } from 'vitest';
import {
  applyFormationPresetToSlide,
  type FormationSlotPreset,
  projectFormationSlotsToScreenNorm,
} from '@/lib/tactical/acl/formation-translator';
import {
  type SquadMemberInput,
  translateSquadToDomainPlayers,
} from '@/lib/tactical/acl/match-squad-translator';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

describe('Formation Translator ACL', () => {
  it('projectFormationSlotsToScreenNorm: projects slots for home team in full pitch mode correctly', () => {
    const slots: FormationSlotPreset[] = [
      { shirtNo: '1', position: 'GK', x: 10, y: 50 },
    ];
    const projected = projectFormationSlotsToScreenNorm(slots, 'home', 'full');

    expect(projected).toHaveLength(1);
    expect(projected[0].shirtNo).toBe('1');
    expect(projected[0].position).toBe('GK');
    // x = 6 + (10 * 0.5 / 100) * 88 = 10.4
    // y = 6 + (50 / 100) * 88 = 50
    expect(projected[0].point.x).toBeCloseTo(10.4);
    expect(projected[0].point.y).toBeCloseTo(50);
  });

  it('projectFormationSlotsToScreenNorm: projects slots for away team in full pitch mode correctly', () => {
    const slots: FormationSlotPreset[] = [
      { shirtNo: '1', position: 'GK', x: 10, y: 50 },
    ];
    const projected = projectFormationSlotsToScreenNorm(slots, 'away', 'full');

    expect(projected).toHaveLength(1);
    // x = 6 + ((100 - 10 * 0.5) / 100) * 88 = 6 + 83.6 = 89.6
    expect(projected[0].point.x).toBeCloseTo(89.6);
    expect(projected[0].point.y).toBeCloseTo(50);
  });

  it('applyFormationPresetToSlide: applies formation to slide players and sends excess to bench', () => {
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

    // Apply preset with only 1 slot
    const slots: FormationSlotPreset[] = [
      { shirtNo: '1', position: 'GK', x: 10, y: 50 },
    ];

    const nextSlide = applyFormationPresetToSlide(
      initialSlide,
      slots,
      'home',
      'full',
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
    expect(homePitch[0].x).toBeCloseTo(10.4);
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
