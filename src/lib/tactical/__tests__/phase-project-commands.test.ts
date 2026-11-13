import { describe, expect, it } from 'vitest';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { applyTacticalCommand } from '../domain/project-reducer';

const style = {
  markerType: 'circle' as const,
  insideContent: 'number' as const,
  bottomLabel: 'name' as const,
  color: '#034694',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1,
  numberSizeScale: 1,
  labelSizeScale: 1,
};

const player = (
  id: string,
  team: 'home' | 'away',
  x: number,
  y: number,
): PitchPlayer => ({
  id,
  area: 'pitch',
  team,
  x: clampToScreenNorm(x),
  y: clampToScreenNorm(y),
  style,
  connectLines: [],
  badges: [],
});

const slide = (id: string, overrides?: Partial<DomainSlide>): DomainSlide => ({
  id,
  index: 0,
  players: [player('h1', 'home', 80, 30), player('a1', 'away', 20, 70)],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'ease-in-out',
  ...overrides,
});

const phase = (
  id: string,
  slides: DomainSlide[],
  overrides?: Partial<DomainTacticalPhase>,
): DomainTacticalPhase => ({
  id,
  name: id,
  aspectRatio: '16:9',
  boundaryBox: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    enabled: true,
    visible: false,
    fitTarget: 'pitch',
  },
  backgroundType: 'pitch',
  slides,
  ...overrides,
});

const makeProject = (phases: DomainTacticalPhase[]): DomainTacticalProject => ({
  id: 'proj-1',
  version: '3.0.0',
  title: 'Test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  homeColor: { primary: '#034694' },
  awayColor: { primary: '#ef4444' },
  pitchAppearance: {
    pitchBackgroundType: 'solid',
    overlayColor: '#0B303E',
    overlayOpacity: 1,
    lineColor: '#ffffff',
    lineWidth: 2.5,
    lineOpacity: 1,
  },
  screenBackground: { type: 'cinematic' },
  tags: [],
  phases,
});

describe('CHANGE_PHASE_ASPECT_RATIO & boundary/pitch commands', () => {
  it('指定フェーズのみ比率変更・座標変換し、他フェーズは変更しない', () => {
    const proj = makeProject([
      phase('ph1', [slide('s1')]),
      phase('ph2', [slide('s2')]),
    ]);
    const next = applyTacticalCommand(proj, {
      type: 'CHANGE_PHASE_ASPECT_RATIO',
      phaseId: 'ph1',
      aspectRatio: '9:16',
    });
    expect(next.phases[0].aspectRatio).toBe('9:16');
    expect(next.phases[1].aspectRatio).toBe('16:9');
    expect(next.phases[0].slides[0].players[0].x).not.toBe(80);
    expect(next.phases[1].slides[0].players[0].x).toBe(80);
  });

  it('CENTER_PITCH_AND_BOUNDARY で pitchTransform と boundaryBox を初期化する', () => {
    const proj = makeProject([
      phase(
        'ph1',
        [
          slide('s1', {
            pitchTransform: {
              panX: 100,
              panY: 50,
              zoom: 2,
              tilt: 30,
              yaw: 45,
              isLocked: false,
            },
          }),
        ],
        {
          boundaryBox: {
            x: 20,
            y: 20,
            width: 60,
            height: 60,
            enabled: true,
          },
        },
      ),
    ]);
    const next = applyTacticalCommand(proj, {
      type: 'CENTER_PITCH_AND_BOUNDARY',
      phaseId: 'ph1',
      slideId: 's1',
    });
    expect(next.phases[0].boundaryBox.width).toBe(100);
    expect(next.phases[0].slides[0].pitchTransform).toEqual({
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      yaw: 90,
      isLocked: false,
    });
  });
});

describe('APPLY_IMAGE_BACKGROUND, RESTORE_DEFAULT_PITCH & bulk style commands', () => {
  it('編集済みスライドへの APPLY_IMAGE_BACKGROUND で新規スライドを追加し RESTORE_DEFAULT_PITCH で戻す', () => {
    const proj = makeProject([phase('ph1', [slide('s1')])]);
    const withImg = applyTacticalCommand(proj, {
      type: 'APPLY_IMAGE_BACKGROUND',
      phaseId: 'ph1',
      slideId: 's1',
      url: 'data:image/png;base64,test',
      newSlideId: 's-new',
    });
    expect(withImg.phases[0].backgroundType).toBe('image');
    expect(withImg.phases[0].slides).toHaveLength(2);
    expect(withImg.phases[0].slides[1].id).toBe('s-new');
    expect(
      withImg.phases[0].slides[1].players.every((p) => p.area === 'bench'),
    ).toBe(true);

    const restored = applyTacticalCommand(withImg, {
      type: 'RESTORE_DEFAULT_PITCH',
      phaseId: 'ph1',
    });
    expect(restored.phases[0].backgroundType).toBe('pitch');
    expect(restored.phases[0].backgroundImageUrl).toBeUndefined();
  });

  it('APPLY_PLAYER_STYLE_TO_PHASE_SLIDES / APPLY_BALL_SCALE_TO_PHASE_SLIDES / SET_TEAM_COLOR が一括反映される', () => {
    const proj = makeProject([
      phase('ph1', [slide('s1'), slide('s2', { index: 1 })]),
      phase('ph2', [slide('s3')]),
    ]);

    const styled = applyTacticalCommand(proj, {
      type: 'APPLY_PLAYER_STYLE_TO_PHASE_SLIDES',
      phaseId: 'ph1',
      stylePatch: { insideContent: 'photo', sizeScale: 1.4 },
      targetTeam: 'home',
    });
    for (const s of styled.phases[0].slides) {
      const h = s.players.find((p) => p.team === 'home');
      const a = s.players.find((p) => p.team === 'away');
      expect(h?.style.insideContent).toBe('photo');
      expect(h?.style.sizeScale).toBe(1.4);
      expect(a?.style.insideContent).toBe('number');
    }

    const ballScaled = applyTacticalCommand(styled, {
      type: 'APPLY_BALL_SCALE_TO_PHASE_SLIDES',
      phaseId: 'ph1',
      sizeScale: 1.6,
    });
    expect(
      ballScaled.phases[0].slides.every((s) => s.ball.sizeScale === 1.6),
    ).toBe(true);
    expect(ballScaled.phases[1].slides[0].ball.sizeScale).toBeUndefined();

    const recolored = applyTacticalCommand(ballScaled, {
      type: 'SET_TEAM_COLOR',
      team: 'away',
      primary: '#10b981',
    });
    expect(recolored.awayColor.primary).toBe('#10b981');
    for (const ph of recolored.phases) {
      for (const s of ph.slides) {
        const a = s.players.find((p) => p.team === 'away');
        expect(a?.style.color).toBe('#10b981');
      }
    }
  });
});
