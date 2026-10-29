import { render } from '@testing-library/react';
import type Konva from 'konva';
import { createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerMarkerItem } from '@/features/tactical-unified/core/components/PlayerMarkerItem';
import { PlayerMarkerRingFade } from '@/features/tactical-unified/objects/player/components/player-marker-ring-fade';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

vi.mock(
  '@/features/tactical-unified/objects/player/hooks/use-player-photo',
  () => ({
    usePlayerPhoto: vi.fn(),
  }),
);

beforeEach(() => {
  vi.clearAllMocks();
  const mockCtx = new Proxy(
    {
      getImageData: () => ({ data: new Array(4) }),
      createImageData: () => [],
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      measureText: () => ({ width: 0 }),
      getLineDash: () => [],
      isPointInPath: () => true,
      createRadialGradient: () => ({
        addColorStop: vi.fn(),
      }),
    } as Record<string, unknown>,
    {
      get: (target, prop: string) => (prop in target ? target[prop] : vi.fn()),
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
});

describe('PlayerMarkerRingFade', () => {
  it('PlayerMarkerRingFade が正常に Konva Stage 内でレンダリングされる', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#38bdf8'),
      style: {
        ...createDefaultPlayer('home', 50, 50, '#38bdf8').style,
        markerType: 'ring-fade' as const,
      },
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerRingFade
            player={marker}
            radius={20}
            numScale={1}
            isSelected={false}
          />
        </Layer>
      </Stage>,
    );

    const ellipses = stageRef.current?.find('Ellipse') ?? [];
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it('基準サイズが従来の2倍相当 (rx=radius*2.3, ry=radius*1.1) でレンダリングされる', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#38bdf8'),
      style: {
        ...createDefaultPlayer('home', 50, 50, '#38bdf8').style,
        markerType: 'ring-fade' as const,
      },
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerRingFade
            player={marker}
            radius={20}
            numScale={1}
            isSelected={false}
          />
        </Layer>
      </Stage>,
    );

    const ellipses = stageRef.current?.find('Ellipse') ?? [];
    expect(ellipses.length).toBeGreaterThan(0);
    // 基準サイズ rx = 20 * 2.3 = 46, ry = 20 * 1.1 = 22
    const baseEllipse = ellipses.find(
      (el) => Math.abs(el.attrs.radiusX - 46) < 0.1,
    );
    expect(baseEllipse).toBeDefined();
    expect(Math.abs((baseEllipse?.attrs.radiusY ?? 0) - 22)).toBeLessThan(0.1);
  });

  it('多層フォグ減衰（外側ほど薄くなる）と glowBlur / glowOpacity が反映される', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#38bdf8'),
      style: {
        ...createDefaultPlayer('home', 50, 50, '#38bdf8').style,
        markerType: 'ring-fade' as const,
        glowBlur: 50,
        glowOpacity: 0.8,
      },
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerRingFade
            player={marker}
            radius={20}
            numScale={1}
            isSelected={false}
          />
        </Layer>
      </Stage>,
    );

    const ellipses = stageRef.current?.find('Ellipse') ?? [];
    // 接地シャドウの楕円が存在しないこと
    const shadowEllipse = ellipses.find(
      (el) => el.attrs.fill === 'rgba(0, 0, 0, 0.4)',
    );
    expect(shadowEllipse).toBeUndefined();

    // 広域フォグ層 (glowBlur * 1.5 = 75, opacity = 0.8 * 0.35 = 0.28)
    const wideFog = ellipses.find(
      (el) => Math.abs(el.attrs.shadowBlur - 75) < 0.1,
    );
    expect(wideFog).toBeDefined();
    expect(Math.abs((wideFog?.attrs.opacity ?? 0) - 0.28)).toBeLessThan(0.01);

    // 中間フォグ層 (glowBlur * 0.8 = 40, opacity = 0.8 * 0.65 = 0.52)
    const midFog = ellipses.find(
      (el) => Math.abs(el.attrs.shadowBlur - 40) < 0.1,
    );
    expect(midFog).toBeDefined();
    expect(Math.abs((midFog?.attrs.opacity ?? 0) - 0.52)).toBeLessThan(0.01);

    // コアエッジ (glowBlur * 0.3 = 15, opacity = 1.0)
    const coreEdge = ellipses.find(
      (el) => Math.abs(el.attrs.shadowBlur - 15) < 0.1,
    );
    expect(coreEdge).toBeDefined();
    expect(coreEdge?.attrs.opacity ?? 1.0).toBe(1.0);
  });

  it('PlayerMarkerItem に markerType="ring-fade" を渡したとき PlayerMarkerRingFade の要素が描画される', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#38bdf8'),
      style: {
        ...createDefaultPlayer('home', 50, 50, '#38bdf8').style,
        markerType: 'ring-fade' as const,
      },
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={800}
            height={450}
            baseDim={450}
            markerMode="all"
            aspectRatio="16:9"
            isSelected={true}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    // Circle (2Dサークル) ではなく Ellipse または Shape が描画されていること
    const circles = stage?.find('Circle') ?? [];
    expect(circles.length).toBe(0);
    const ellipses = stage?.find('Ellipse') ?? [];
    expect(ellipses.length).toBeGreaterThan(0);
  });
});
