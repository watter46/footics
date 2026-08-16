import { describe, expect, it, vi } from 'vitest';
import type { TacticalScene } from '@/stores/tactical-animation-store';
import type { InterpolatedFrameState } from '../../interpolation';
import {
  drawPitchBackgroundToContext,
  extractPlayerMetadataMap,
  type RenderContext2D,
  renderPitchFrame,
} from '../pitch-renderer';

function createMockContext(): RenderContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineJoin: 'miter',
    miterLimit: 10,
    font: '',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',

    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    drawImage: vi.fn(),
    clearRect: vi.fn(),
  };
}

describe('pitch-renderer', () => {
  const mockScenes: TacticalScene[] = [
    {
      id: 'sc-1',
      durationMs: 1000,
      pauseMs: 500,
      players: {
        '10': {
          playerId: '10',
          name: 'Messi',
          shirtNo: '10',
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
      },
      ballPos: { x: 50, y: 50 },
    },
  ];

  it('extractPlayerMetadataMap extracts unique players across scenes', () => {
    const metaMap = extractPlayerMetadataMap(mockScenes);
    expect(metaMap.has('10')).toBe(true);
    const p10 = metaMap.get('10');
    expect(p10?.name).toBe('Messi');
    expect(p10?.shirtNo).toBe('10');
    expect(p10?.options.color).toBe('#3b82f6');
  });

  it('drawPitchBackgroundToContext draws vertical pitch background with correct penalty arc angles', () => {
    const ctx = createMockContext();
    drawPitchBackgroundToContext(ctx, 1080, 1668, 'vertical');

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1080, 1668);
    expect(ctx.strokeRect).toHaveBeenCalled();

    // Center circle (0 to 2*PI) + center spot + top spot + top arc + bottom spot + bottom arc = 6 ellipse calls
    expect(ctx.ellipse).toHaveBeenCalledTimes(6);

    const ellipseCalls = (ctx.ellipse as ReturnType<typeof vi.fn>).mock.calls;

    // Top penalty arc (call index 3): start angle ~0.644 (37 deg), end angle ~2.497 (143 deg), counterclockwise: false
    const topArcCall = ellipseCalls[3];
    expect(topArcCall[5]).toBeCloseTo(0.644, 2);
    expect(topArcCall[6]).toBeCloseTo(2.497, 2);
    expect(topArcCall[7]).toBe(false);

    // Bottom penalty arc (call index 5): start angle ~-2.497 (-143 deg), end angle ~-0.644 (-37 deg), counterclockwise: false
    const btmArcCall = ellipseCalls[5];
    expect(btmArcCall[5]).toBeCloseTo(-2.497, 2);
    expect(btmArcCall[6]).toBeCloseTo(-0.644, 2);
    expect(btmArcCall[7]).toBe(false);
  });

  it('drawPitchBackgroundToContext draws horizontal pitch background with correct penalty arc angles', () => {
    const ctx = createMockContext();
    drawPitchBackgroundToContext(ctx, 1668, 1080, 'horizontal');

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1668, 1080);
    expect(ctx.strokeRect).toHaveBeenCalled();

    // Center circle + center spot + left spot + left arc + right spot + right arc = 6 ellipse calls
    expect(ctx.ellipse).toHaveBeenCalledTimes(6);

    const ellipseCalls = (ctx.ellipse as ReturnType<typeof vi.fn>).mock.calls;

    // Left penalty arc (call index 3): start angle ~-0.925 (-53 deg), end angle ~0.925 (+53 deg), counterclockwise: false
    const leftArcCall = ellipseCalls[3];
    expect(leftArcCall[5]).toBeCloseTo(-0.925, 2);
    expect(leftArcCall[6]).toBeCloseTo(0.925, 2);
    expect(leftArcCall[7]).toBe(false);

    // Right penalty arc (call index 5): start angle ~2.216 (+127 deg), end angle ~-2.216 (-127 deg), counterclockwise: false
    const rightArcCall = ellipseCalls[5];
    expect(rightArcCall[5]).toBeCloseTo(2.216, 2);
    expect(rightArcCall[6]).toBeCloseTo(-2.216, 2);
    expect(rightArcCall[7]).toBe(false);
  });

  it('renderPitchFrame renders background blit, players, text, and ball', () => {
    const ctx = createMockContext();
    const metaMap = extractPlayerMetadataMap(mockScenes);

    const frameState: InterpolatedFrameState = {
      players: {
        '10': {
          playerId: '10',
          x: 25,
          y: 35,
          opacity: 1,
          visible: true,
        },
      },
      ballPos: { x: 50, y: 50 },
      activeSceneIndex: 0,
    };

    const mockBgCanvas = {} as unknown as CanvasImageSource;
    renderPitchFrame(ctx, mockBgCanvas, frameState, metaMap, 1080, 1668);

    // 1. Background blit
    expect(ctx.drawImage).toHaveBeenCalledWith(mockBgCanvas, 0, 0, 1080, 1668);

    // 2. Player marker (circle + number text + bottom label)
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith(
      '10',
      (25 / 100) * 1080,
      (35 / 100) * 1668,
    );
    expect(ctx.strokeText).toHaveBeenCalledWith(
      'Messi',
      (25 / 100) * 1080,
      expect.any(Number),
    );

    // 3. Ball marker
    expect(ctx.arc).toHaveBeenCalledWith(
      (50 / 100) * 1080,
      (50 / 100) * 1668,
      expect.any(Number),
      0,
      Math.PI * 2,
    );
  });
});
