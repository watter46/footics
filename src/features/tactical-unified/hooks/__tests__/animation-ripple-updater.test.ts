import Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';
import { updatePlayerRippleRings } from '@/features/tactical-unified/hooks/animation-ripple-updater';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';

describe('updatePlayerRippleRings', () => {
  it('波紋エフェクトに color が指定されている場合、最優先でその色が stroke に適用されること', () => {
    const group = new Konva.Group();
    const pState = {
      id: 'p1',
      x: 50,
      y: 50,
      visible: true,
      opacity: 1,
      style: {
        color: '#0000ff',
        markerEffect: {
          type: 'ripple',
          color: '#ff0000',
          delay: 0,
          duration: 1.0,
          ringsCount: 1,
          repeatCount: 1,
          maxRadiusScale: 2.0,
          exitAction: 'keep',
        },
      },
    } as unknown as InterpolatedPlayerState;

    // timeInSlideMs: 500 (duration: 1000ms の半分で波紋が表示される状態)
    updatePlayerRippleRings(group, pState, 500, true);

    const rings = group.find<Konva.Circle>('.ripple-ring');
    expect(rings.length).toBeGreaterThan(0);
    const visibleRing = rings.find((r) => r.visible());
    expect(visibleRing).toBeDefined();
    expect(visibleRing?.stroke()).toBe('#ff0000');
  });

  it('波紋エフェクトに color が指定されていない場合、選手の style.color が適用されること', () => {
    const group = new Konva.Group();
    const pState = {
      id: 'p1',
      x: 50,
      y: 50,
      visible: true,
      opacity: 1,
      style: {
        color: '#10b981',
        markerEffect: {
          type: 'ripple',
          delay: 0,
          duration: 1.0,
          ringsCount: 1,
          repeatCount: 1,
          maxRadiusScale: 2.0,
          exitAction: 'keep',
        },
      },
    } as unknown as InterpolatedPlayerState;

    updatePlayerRippleRings(group, pState, 500, true);

    const rings = group.find<Konva.Circle>('.ripple-ring');
    const visibleRing = rings.find((r) => r.visible());
    expect(visibleRing).toBeDefined();
    expect(visibleRing?.stroke()).toBe('#10b981');
  });

  it('同一 playerGroup に対して updatePlayerRippleRings を 2 回連続で呼んだ際、2 回目は WeakMap キャッシュが使われ playerGroup.find が再実行されないこと', () => {
    const group = new Konva.Group();
    const findSpy = vi.spyOn(group, 'find');
    const pState = {
      id: 'p1',
      x: 50,
      y: 50,
      visible: true,
      opacity: 1,
      style: {
        color: '#ff0000',
        markerEffect: {
          type: 'ripple',
          delay: 0,
          duration: 1.0,
          ringsCount: 3,
          repeatCount: 1,
          maxRadiusScale: 2.0,
          exitAction: 'keep',
        },
      },
    } as unknown as InterpolatedPlayerState;

    // 1 回目の実行: find が呼ばれて WeakMap にキャッシュされる
    updatePlayerRippleRings(group, pState, 200, true);
    expect(findSpy).toHaveBeenCalledTimes(1);

    // 2 回目の実行: キャッシュが使われ、find は再度呼ばれない
    updatePlayerRippleRings(group, pState, 400, true);
    expect(findSpy).toHaveBeenCalledTimes(1);
  });
});
