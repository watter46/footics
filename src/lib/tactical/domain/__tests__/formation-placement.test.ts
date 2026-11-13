import { describe, expect, it } from 'vitest';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import {
  computeDomainSlideAfterFormation,
  createDefaultDomainPlayer,
} from '../formation-placement';
import {
  buildDomainSquadPlayers,
  computeDomainBenchGridPositions,
  computeDomainPresetPlayers,
} from '../squad-placement';

describe('formation & squad placement pure domain helpers', () => {
  it('computes formation coordinates for home pitch players without mutating away team', () => {
    const project = createDefaultTacticalProject();
    const rawSlide = project.phases[0]!.slides[0]!;
    const slide = { ...rawSlide, players: [] as DomainPlayer[] };
    const updated = computeDomainSlideAfterFormation(
      slide,
      project,
      '16:9',
      '4-3-3',
      'full',
      'home',
    );
    expect(
      updated.filter((p) => p.team === 'home' && p.area === 'pitch'),
    ).toHaveLength(11);
    expect(updated.filter((p) => p.team === 'away')).toEqual(
      slide.players.filter((p) => p.team === 'away'),
    );
  });

  it('sorts bench players by position rank (FW -> MF -> DF -> GK) and assigns 3-column grid', () => {
    const gk = {
      ...createDefaultDomainPlayer('home', 0, 0, '#0000ff', 'bench', 'gk'),
      position: 'GK',
      shirtNo: '12',
    };
    const st = {
      ...createDefaultDomainPlayer('home', 0, 0, '#0000ff', 'bench', 'st'),
      position: 'ST',
      shirtNo: '9',
    };
    if (gk.area !== 'bench' || st.area !== 'bench')
      throw new Error('expected bench');
    const sorted = computeDomainBenchGridPositions([gk, st]);
    expect(sorted[0]?.id).toBe('st');
    expect(Number(sorted[0]?.x)).toBe(20);
    expect(sorted[1]?.id).toBe('gk');
    expect(Number(sorted[1]?.x)).toBe(50);
  });

  it('builds Domain starters and bench grid from club squad items', () => {
    const items = Array.from({ length: 13 }, (_, idx) => ({
      playerId: idx + 1,
      name: `Player ${idx + 1}`,
      shirtNo: idx + 1,
      position: idx === 0 ? 'GK' : 'CM',
      isFirstEleven: idx < 11,
    }));
    const result = buildDomainSquadPlayers(items, {
      team: 'home',
      formation: '4-2-3-1',
      primaryColor: '#034694',
      aspectRatio: '16:9',
    });
    expect(result.filter((p) => p.area === 'pitch')).toHaveLength(11);
    expect(result.filter((p) => p.area === 'bench')).toHaveLength(2);
  });

  it('applies season formation preset players onto active team', () => {
    const project = createDefaultTacticalProject();
    const rawSlide = project.phases[0]!.slides[0]!;
    const slide = { ...rawSlide, players: [] as DomainPlayer[] };
    const updated = computeDomainPresetPlayers(slide, project, 'home', {
      id: 'preset-1',
      name: 'Sample',
      mode: 'half',
      formation: '4-2-3-1',
      players: [{ shirtNo: '20', position: 'AM', x: 60, y: 45 }],
    });
    const homePitch = updated.filter(
      (p) => p.team === 'home' && p.area === 'pitch',
    );
    expect(homePitch).toHaveLength(1);
    expect(homePitch[0]?.shirtNo).toBe('20');
  });
});
