import { describe, expect, it, vi } from 'vitest';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import { renderPlayers } from '../player-renderer';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
} from '../renderer-context';

describe('renderPlayers - teamVisibility filtering', () => {
  const w = 1920;
  const h = 1080;
  const aspectRatio = '16:9';

  const createMockContext = () => {
    const filledTexts: string[] = [];

    const ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fillText: vi.fn((text: string) => {
        filledTexts.push(text);
      }),
      strokeText: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
    } as unknown as AnyCanvasRenderingContext2D;

    const frameCtx = createFrameRenderContext({
      ctx,
      baseWidth: w,
      baseHeight: h,
      aspectRatio,
    });

    return { ctx, frameCtx, filledTexts };
  };

  const samplePlayers = {
    h1: {
      id: 'h1',
      name: 'Home Striker',
      shirtNo: '9',
      team: 'home',
      x: 30,
      y: 50,
      visible: true,
      opacity: 1,
      style: {
        bottomLabel: 'name',
      },
    },
    a1: {
      id: 'a1',
      name: 'Away Defender',
      shirtNo: '4',
      team: 'away',
      x: 70,
      y: 50,
      visible: true,
      opacity: 1,
      style: {
        bottomLabel: 'name',
      },
    },
    n1: {
      id: 'n1',
      name: 'Referee Neutral',
      shirtNo: '1',
      team: 'neutral',
      x: 50,
      y: 50,
      visible: true,
      opacity: 1,
      style: {
        bottomLabel: 'name',
      },
    },
  } as unknown as Record<string, InterpolatedPlayerState>;

  it('1. teamVisibility = "home" の場合、home 選手と neutral 選手のみ描画され away 選手は描画されないこと', () => {
    const { frameCtx, filledTexts } = createMockContext();

    renderPlayers(frameCtx, samplePlayers, undefined, 'home');

    expect(filledTexts).toContain('Striker');
    expect(filledTexts).toContain('Neutral');
    expect(filledTexts).not.toContain('Defender');
  });

  it('2. teamVisibility = "away" の場合、away 選手と neutral 選手のみ描画され home 選手は描画されないこと', () => {
    const { frameCtx, filledTexts } = createMockContext();

    renderPlayers(frameCtx, samplePlayers, undefined, 'away');

    expect(filledTexts).toContain('Defender');
    expect(filledTexts).toContain('Neutral');
    expect(filledTexts).not.toContain('Striker');
  });

  it('3. teamVisibility = "both" または undefined の場合、全選手が描画されること', () => {
    const { frameCtx: frameCtxBoth, filledTexts: textsBoth } =
      createMockContext();
    renderPlayers(frameCtxBoth, samplePlayers, undefined, 'both');
    expect(textsBoth).toContain('Striker');
    expect(textsBoth).toContain('Defender');
    expect(textsBoth).toContain('Neutral');

    const { frameCtx: frameCtxUndef, filledTexts: textsUndef } =
      createMockContext();
    renderPlayers(frameCtxUndef, samplePlayers, undefined, undefined);
    expect(textsUndef).toContain('Striker');
    expect(textsUndef).toContain('Defender');
    expect(textsUndef).toContain('Neutral');
  });

  it('4. p.style.transparentBackground === true の場合、背景円の ctx.fill() が呼ばれないこと', () => {
    const { ctx, frameCtx } = createMockContext();
    const transparentPlayer = {
      p1: {
        id: 'p1',
        name: 'Transparent Player',
        shirtNo: '10',
        team: 'home',
        x: 50,
        y: 50,
        visible: true,
        opacity: 1,
        style: {
          insideContent: 'number',
          bottomLabel: 'none',
          transparentBackground: true,
          color: '#38bdf8',
        },
      },
    } as unknown as Record<string, InterpolatedPlayerState>;

    renderPlayers(frameCtx, transparentPlayer);

    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('5. p.style.insideContent === "photo" かつ写真がロードされていない場合、ctx.stroke() が呼ばれないこと', () => {
    const { ctx, frameCtx } = createMockContext();
    const photoPlayer = {
      p1: {
        id: 'p1',
        name: 'Photo Player',
        shirtNo: '7',
        team: 'home',
        x: 50,
        y: 50,
        visible: true,
        opacity: 1,
        style: {
          insideContent: 'photo',
          bottomLabel: 'none',
          strokeColor: '#ffffff',
          strokeWidth: 2,
        },
      },
    } as unknown as Record<string, InterpolatedPlayerState>;

    renderPlayers(frameCtx, photoPlayer, {});

    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});
