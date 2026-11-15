import { render } from '@testing-library/react';
import type Konva from 'konva';
import { type ComponentProps, createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerMarkerCircle } from '@/features/tactical-unified/objects/player/components/player-marker-circle';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

type DomainPlayer = ComponentProps<typeof PlayerMarkerCircle>['player'];

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
    } as Record<string, unknown>,
    {
      get: (target, prop: string) => (prop in target ? target[prop] : vi.fn()),
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
});

describe('PlayerMarkerCircle', () => {
  it('insideContent === "photo" かつ loadedImage === null でも strokeWidth=0, stroke="transparent" になり、白枠が出ないこと', () => {
    const stageRef = createRef<Konva.Stage>();
    const basePlayer = createDefaultPlayer('home', 50, 50, '#38bdf8');
    const player = {
      ...basePlayer,
      area: 'pitch' as const,
      x: toScreenNormCoord(basePlayer.x),
      y: toScreenNormCoord(basePlayer.y),
      trajectory: undefined,
      style: {
        ...basePlayer.style,
        insideContent: 'photo' as const,
        transparentBackground: true,
      },
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerCircle
            player={player}
            radius={20}
            numScale={1}
            isSelected={false}
            loadedImage={null}
          />
        </Layer>
      </Stage>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    const circles = stage?.find('Circle') ?? [];
    expect(circles.length).toBeGreaterThan(0);
    const circle = circles[0];
    expect(circle.attrs.strokeWidth).toBe(0);
    expect(circle.attrs.stroke).toBe('transparent');
    expect(circle.attrs.fill).toBe('transparent');
  });

  it('isSelected === true の場合は photo マーカーであっても青い選択枠 (strokeWidth=3, stroke="#60a5fa") が表示されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const basePlayer = createDefaultPlayer('home', 50, 50, '#38bdf8');
    const player = {
      ...basePlayer,
      area: 'pitch' as const,
      x: toScreenNormCoord(basePlayer.x),
      y: toScreenNormCoord(basePlayer.y),
      trajectory: undefined,
      style: {
        ...basePlayer.style,
        insideContent: 'photo' as const,
      },
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerMarkerCircle
            player={player}
            radius={20}
            numScale={1}
            isSelected={true}
            loadedImage={null}
          />
        </Layer>
      </Stage>,
    );

    const circles = stageRef.current?.find('Circle') ?? [];
    const circle = circles[0];
    expect(circle.attrs.strokeWidth).toBe(3);
    expect(circle.attrs.stroke).toBe('#60a5fa');
  });
});
