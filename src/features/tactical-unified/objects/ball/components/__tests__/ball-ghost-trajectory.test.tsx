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
  const defaultProps = {
    hasPrevBall: true,
    prevBall: { x: 50, y: 50, visible: true },
    ball: { x: 50, y: 50, visible: true },
    prevPxX: 400,
    prevPxY: 300,
    radius: 12,
    ballImage: null,
    stageSize: { width: 800, height: 600 },
    onUpdateTrajectory: vi.fn(),
  };

  it('cleanRender=true の場合は選択中やドラッグ中であってもレンダリングされない', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <Stage ref={stageRef} width={800} height={600}>
        <Layer>
          <BallGhostTrajectory
            {...defaultProps}
            cleanRender={true}
            isSelected={true}
            isDragging={true}
          />
        </Layer>
      </Stage>,
    );

    const arrows = stageRef.current?.find('Arrow') ?? [];
    expect(arrows.length).toBe(0);
  });

  it('非選択かつ非ドラッグ時 (isSelected=false && isDragging=false) はレンダリングされない', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <Stage ref={stageRef} width={800} height={600}>
        <Layer>
          <BallGhostTrajectory
            {...defaultProps}
            isSelected={false}
            isDragging={false}
          />
        </Layer>
      </Stage>,
    );

    const arrows = stageRef.current?.find('Arrow') ?? [];
    expect(arrows.length).toBe(0);
  });

  it('選択中 (isSelected=true) の場合、初期位置（距離0）でもゴーストボールと矢印がレンダリングされる', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <Stage ref={stageRef} width={800} height={600}>
        <Layer>
          <BallGhostTrajectory
            {...defaultProps}
            isSelected={true}
            isDragging={false}
          />
        </Layer>
      </Stage>,
    );

    const arrows = stageRef.current?.find('Arrow') ?? [];
    expect(arrows.length).toBe(1);
  });

  it('ドラッグ中 (isDragging=true) の場合、初期位置（距離0）でもゴーストボールと矢印がレンダリングされる', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <Stage ref={stageRef} width={800} height={600}>
        <Layer>
          <BallGhostTrajectory
            {...defaultProps}
            isSelected={false}
            isDragging={true}
          />
        </Layer>
      </Stage>,
    );

    const arrows = stageRef.current?.find('Arrow') ?? [];
    expect(arrows.length).toBe(1);
  });

  it('前スライドからのボールがない場合 (hasPrevBall=false) はレンダリングされない', () => {
    const stageRef = createRef<Konva.Stage>();
    render(
      <Stage ref={stageRef} width={800} height={600}>
        <Layer>
          <BallGhostTrajectory
            {...defaultProps}
            hasPrevBall={false}
            isSelected={true}
          />
        </Layer>
      </Stage>,
    );

    const arrows = stageRef.current?.find('Arrow') ?? [];
    expect(arrows.length).toBe(0);
  });
});
