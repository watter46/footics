import { describe, expect, it, vi } from 'vitest';
import { createCanvasNodesRegistry } from '@/features/tactical-unified/core';
import { interpolateArrow } from '@/lib/tactical/interpolation-annotation';
import {
  updateArrowNodes,
  updateBallNode,
  updatePlayerNodes,
  updateTextNodes,
} from '../animation-node-updater';

describe('animation-node-updater', () => {
  it('adds offsetX and offsetY to player node positions', () => {
    const registry = createCanvasNodesRegistry();
    const mockPos = vi.fn();
    const mockPlayerGroup = {
      position: mockPos,
      opacity: vi.fn(),
      visible: vi.fn(),
    } as any;
    registry.playerNodes.set('p1', mockPlayerGroup);

    const players = {
      p1: {
        id: 'p1',
        x: 50,
        y: 50,
        opacity: 1,
        visible: true,
      } as any,
    };

    // stage: 1000x500, offset: (100, 50)
    updatePlayerNodes(players, registry, 1000, 500, 100, 50);

    expect(mockPos).toHaveBeenCalledWith({
      x: 100 + 0.5 * 1000, // 600
      y: 50 + 0.5 * 500, // 300
    });
  });

  it('adds offsetX and offsetY to ball node position', () => {
    const registry = createCanvasNodesRegistry();
    const mockPos = vi.fn();
    registry.ballNode = {
      position: mockPos,
      opacity: vi.fn(),
      visible: vi.fn(),
    } as any;

    const ball = {
      x: 20,
      y: 80,
      opacity: 1,
      visible: true,
    };

    updateBallNode(ball, registry, 1000, 500, 50, 20);

    expect(mockPos).toHaveBeenCalledWith({
      x: 50 + 0.2 * 1000, // 250
      y: 20 + 0.8 * 500, // 420
    });
  });

  it('updates ball node rotation using ball.rotation', () => {
    const registry = createCanvasNodesRegistry();
    const mockRotation = vi.fn();
    registry.ballNode = {
      position: vi.fn(),
      opacity: vi.fn(),
      visible: vi.fn(),
      rotation: mockRotation,
    } as any;

    const ball = {
      x: 30,
      y: 40,
      opacity: 1,
      visible: true,
      rotation: 144,
    };

    updateBallNode(ball, registry, 1000, 500);

    expect(mockRotation).toHaveBeenCalledWith(144);
  });

  it('defaults ball node rotation to 0 when rotation is undefined', () => {
    const registry = createCanvasNodesRegistry();
    const mockRotation = vi.fn();
    registry.ballNode = {
      position: vi.fn(),
      opacity: vi.fn(),
      visible: vi.fn(),
      rotation: mockRotation,
    } as any;

    const ball = {
      x: 30,
      y: 40,
      opacity: 1,
      visible: true,
    };

    updateBallNode(ball, registry, 1000, 500);

    expect(mockRotation).toHaveBeenCalledWith(0);
  });

  it('adds offsetX and offsetY to text and arrow nodes', () => {
    const registry = createCanvasNodesRegistry();
    const mockTextPos = vi.fn();
    const mockText = {
      position: mockTextPos,
      text: vi.fn(),
      fontSize: vi.fn(),
      fill: vi.fn(),
      opacity: vi.fn(),
      visible: vi.fn(),
    } as any;
    registry.textNodes.set('t1', mockText);

    updateTextNodes(
      {
        t1: {
          id: 't1',
          x: 10,
          y: 20,
          content: 'Hello',
          fontSize: 14,
          color: '#fff',
          opacity: 1,
          visible: true,
        } as any,
      },
      registry,
      1000,
      500,
      30,
      40,
    );

    expect(mockTextPos).toHaveBeenCalledWith({
      x: 30 + 0.1 * 1000, // 130
      y: 40 + 0.2 * 500, // 140
    });

    const mockPoints = vi.fn();
    const mockArrow = {
      node: {
        points: mockPoints,
        stroke: vi.fn(),
        fill: vi.fn(),
        strokeWidth: vi.fn(),
        opacity: vi.fn(),
        visible: vi.fn(),
      },
    } as any;
    registry.arrowNodes.set('a1', mockArrow);

    updateArrowNodes(
      {
        a1: {
          id: 'a1',
          arrowType: 'pass',
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
          curveType: 'straight',
          color: '#ff0000',
          strokeWidth: 2,
          opacity: 1,
          visible: true,
        } as any,
      },
      registry,
      1000,
      500,
      100,
      200,
    );

    expect(mockPoints).toHaveBeenCalledWith([
      100 + 0.1 * 1000, // 200
      200 + 0.1 * 500, // 250
      100 + 0.2 * 1000, // 300
      200 + 0.2 * 500, // 300
    ]);
  });

  it('updates curved arrow node with quadratic bezier sampled points', () => {
    const registry = createCanvasNodesRegistry();
    const mockPoints = vi.fn();
    const mockArrow = {
      node: {
        points: mockPoints,
        stroke: vi.fn(),
        fill: vi.fn(),
        strokeWidth: vi.fn(),
        opacity: vi.fn(),
        visible: vi.fn(),
      },
    } as any;
    registry.arrowNodes.set('a_curved', mockArrow);

    updateArrowNodes(
      {
        a_curved: {
          id: 'a_curved',
          arrowType: 'pass',
          curveType: 'curved',
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 50 },
          ],
          controlPoint: { x: 40, y: 10 },
          color: '#38bdf8',
          strokeWidth: 3,
          opacity: 1,
          visible: true,
        } as any,
      },
      registry,
      1000,
      500,
      0,
      0,
    );

    expect(mockPoints).toHaveBeenCalledTimes(1);
    const passedPoints = mockPoints.mock.calls[0][0];
    // Bezier sampling generates (steps + 1) * 2 points (31 * 2 = 62 points)
    expect(passedPoints.length).toBeGreaterThan(6);
    // Starts at (100, 50)
    expect(passedPoints[0]).toBeCloseTo(100);
    expect(passedPoints[1]).toBeCloseTo(50);
    // Ends at (500, 250)
    expect(passedPoints[passedPoints.length - 2]).toBeCloseTo(500);
    expect(passedPoints[passedPoints.length - 1]).toBeCloseTo(250);
  });

  it('updates dribble arrow node with wavy sampled points', () => {
    const registry = createCanvasNodesRegistry();
    const mockPoints = vi.fn();
    const mockArrow = {
      node: {
        points: mockPoints,
        stroke: vi.fn(),
        fill: vi.fn(),
        strokeWidth: vi.fn(),
        opacity: vi.fn(),
        visible: vi.fn(),
      },
    } as any;
    registry.arrowNodes.set('a_dribble', mockArrow);

    updateArrowNodes(
      {
        a_dribble: {
          id: 'a_dribble',
          arrowType: 'dribble',
          curveType: 'straight',
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 10 },
          ],
          color: '#38bdf8',
          strokeWidth: 3,
          opacity: 1,
          visible: true,
        } as any,
      },
      registry,
      1000,
      500,
      0,
      0,
    );

    expect(mockPoints).toHaveBeenCalledTimes(1);
    const passedPoints = mockPoints.mock.calls[0][0];
    expect(passedPoints.length).toBeGreaterThan(4);
  });

  describe('interpolateArrow midpoint lerp', () => {
    it('morphs from curved to straight by interpolating controlPoint toward midpoint', () => {
      const curvedArrow = {
        id: 'arr-1',
        annotationType: 'arrow' as const,
        arrowType: 'pass' as const,
        curveType: 'curved' as const,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        controlPoint: { x: 20, y: 80 },
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      };

      const straightArrow = {
        id: 'arr-1',
        annotationType: 'arrow' as const,
        arrowType: 'pass' as const,
        curveType: 'straight' as const,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        // midpoint is (50, 50)
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      };

      // ease = 0.5 -> controlPoint should be midway between (20, 80) and (50, 50) -> (35, 65)
      const midway = interpolateArrow(curvedArrow, straightArrow, 0.5);
      expect(midway).not.toBeNull();
      expect(midway?.controlPoint).toBeDefined();
      expect(midway?.controlPoint?.x).toBeCloseTo(35);
      expect(midway?.controlPoint?.y).toBeCloseTo(65);
      expect(midway?.curveType).toBe('curved');
    });

    it('morphs from straight to curved by interpolating from straight arrow midpoint', () => {
      const straightArrow = {
        id: 'arr-2',
        annotationType: 'arrow' as const,
        arrowType: 'pass' as const,
        curveType: 'straight' as const,
        points: [
          { x: 10, y: 20 },
          { x: 50, y: 60 },
        ],
        // midpoint is (30, 40)
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      };

      const curvedArrow = {
        id: 'arr-2',
        annotationType: 'arrow' as const,
        arrowType: 'pass' as const,
        curveType: 'curved' as const,
        points: [
          { x: 10, y: 20 },
          { x: 50, y: 60 },
        ],
        controlPoint: { x: 50, y: 20 },
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
      };

      // ease = 0.5 -> controlPoint should be midway between (30, 40) and (50, 20) -> (40, 30)
      const midway = interpolateArrow(straightArrow, curvedArrow, 0.5);
      expect(midway).not.toBeNull();
      expect(midway?.controlPoint).toBeDefined();
      expect(midway?.controlPoint?.x).toBeCloseTo(40);
      expect(midway?.controlPoint?.y).toBeCloseTo(30);
      expect(midway?.curveType).toBe('curved');
    });
  });
});
