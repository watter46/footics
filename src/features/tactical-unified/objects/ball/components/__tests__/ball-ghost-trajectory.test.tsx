import { render } from '@testing-library/react';
import type Konva from 'konva';
import { createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BallGhostTrajectory } from '../ball-ghost-trajectory';

beforeEach(() => {
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

describe('BallGhostTrajectory', () => {
  it('非選択時 (isSelected=false) でも移動があった場合はゴーストボールと矢印がレンダリングされる', () => {
    const stageRef = createRef<Konva.Stage>();
    const prevBall = { x: 20, y: 30, visible: true };
    const curBall = { x: 70, y: 80, visible: true };

    render(
      <Stage ref={stageRef} width={800} height={600}>
        <Layer>
          <BallGhostTrajectory
            isSelected={false}
            hasPrevBall={true}
            prevBall={prevBall}
            ball={curBall}
            isBallMoved={true}
            prevPxX={160}
            prevPxY={180}
            radius={12}
            ballImage={null}
            stageSize={{ width: 800, height: 600 }}
            onUpdateTrajectory={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    // GhostTrajectoryArrow の Arrow が描画されていること
    const arrows = stage?.find('Arrow') ?? [];
    expect(arrows.length).toBe(1);
  });

  it('前スライドからの移動がない場合 (isBallMoved=false) はレンダリングされない', () => {
    const stageRef = createRef<Konva.Stage>();
    const prevBall = { x: 50, y: 50, visible: true };
    const curBall = { x: 50, y: 50, visible: true };

    render(
      <Stage ref={stageRef} width={800} height={600}>
        <Layer>
          <BallGhostTrajectory
            isSelected={false}
            hasPrevBall={true}
            prevBall={prevBall}
            ball={curBall}
            isBallMoved={false}
            prevPxX={400}
            prevPxY={300}
            radius={12}
            ballImage={null}
            stageSize={{ width: 800, height: 600 }}
            onUpdateTrajectory={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const arrows = stageRef.current?.find('Arrow') ?? [];
    expect(arrows.length).toBe(0);
  });
});
