import type Konva from 'konva';
import { describe, expect, it } from 'vitest';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { calculatePitchDimensions } from '../tactical-animation-canvas';

describe('calculatePitchDimensions', () => {
  it('stage が registry にある場合、Stage の幅と高さをそのままピッチ実サイズ (x: 0, y: 0) として返す', () => {
    // 任意のStage寸法（レターボックス計算を通すと縮小されてしまうような値）
    const mockStage = {
      width: () => 1000,
      height: () => 600,
    } as Konva.Stage;

    const registryRef = {
      current: {
        stage: mockStage,
      } as CanvasNodesRegistry,
    };

    const dims = calculatePitchDimensions(undefined, registryRef);
    expect(dims).toEqual({
      width: 1000,
      height: 600,
      x: 0,
      y: 0,
    });
  });

  it('pitchSize が明示的に渡された場合、その寸法をそのまま返す', () => {
    const custom = { width: 640, height: 480, x: 10, y: 20 };
    const dims = calculatePitchDimensions(custom);
    expect(dims).toEqual({
      width: 640,
      height: 480,
      x: 10,
      y: 20,
    });
  });

  it('stage も pitchSize もない場合、デフォルトの 800x450 (x: 0, y: 0) を返す', () => {
    const dims = calculatePitchDimensions();
    expect(dims).toEqual({
      width: 800,
      height: 450,
      x: 0,
      y: 0,
    });
  });
});
