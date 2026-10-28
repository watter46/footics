import { describe, expect, it, vi } from 'vitest';
import { createCanvasNodesRegistry } from '@/features/tactical-unified/core';
import { interpolateArrow } from '@/lib/tactical/interpolation-annotation';
import {
  updateArrowNodes,
  updateBallNode,
  updatePlayerNodes,
  updateTextNodes,
  updateZoneNodes,
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

  describe('Route Line and Dot marker support', () => {
    it('applies dot offset shortening and updates startDotNode and endDotNode for route_line', () => {
      const registry = createCanvasNodesRegistry();
      const mockPoints = vi.fn();
      const mockStartDotPos = vi.fn();
      const mockStartDotOpacity = vi.fn();
      const mockStartDotVisible = vi.fn();
      const mockEndDotPos = vi.fn();
      const mockEndDotOpacity = vi.fn();
      const mockEndDotVisible = vi.fn();

      const mockArrowNode = {
        points: mockPoints,
        stroke: vi.fn(),
        fill: vi.fn(),
        strokeWidth: vi.fn(),
        opacity: vi.fn(),
        visible: vi.fn(),
      } as any;

      const mockStartDot = {
        position: mockStartDotPos,
        opacity: mockStartDotOpacity,
        visible: mockStartDotVisible,
      } as any;

      const mockEndDot = {
        position: mockEndDotPos,
        opacity: mockEndDotOpacity,
        visible: mockEndDotVisible,
      } as any;

      registry.arrowNodes.set('rl-1', {
        node: mockArrowNode,
        startDotNode: mockStartDot,
        endDotNode: mockEndDot,
      });

      // Horizontal line from (10%, 20%) to (30%, 20%) on a 1000x500 canvas
      // sPx: (100, 100), ePx: (300, 100), dist = 200px
      // strokeWidth = 3 -> dotRadius = Math.max(5, 3 * 1.6) = 5
      updateArrowNodes(
        {
          'rl-1': {
            id: 'rl-1',
            arrowType: 'route_line',
            points: [
              { x: 10, y: 20 },
              { x: 30, y: 20 },
            ],
            curveType: 'straight',
            color: '#38bdf8',
            strokeWidth: 3,
            opacity: 0.9,
            visible: true,
          } as any,
        },
        registry,
        1000,
        500,
        0,
        0,
      );

      // Points should be shortened by dotRadius (5px) on each side:
      // sx: 100 + 5 = 105, ex: 300 - 5 = 295
      expect(mockPoints).toHaveBeenCalledWith([105, 100, 295, 100]);

      // startDotNode and endDotNode should follow the un-offset endpoints
      expect(mockStartDotPos).toHaveBeenCalledWith({ x: 100, y: 100 });
      expect(mockStartDotOpacity).toHaveBeenCalledWith(0.9);
      expect(mockStartDotVisible).toHaveBeenCalledWith(true);

      expect(mockEndDotPos).toHaveBeenCalledWith({ x: 300, y: 100 });
      expect(mockEndDotOpacity).toHaveBeenCalledWith(0.9);
      expect(mockEndDotVisible).toHaveBeenCalledWith(true);
    });

    it('applies default 6px dot offset when strokeWidth is not specified', () => {
      const registry = createCanvasNodesRegistry();
      const mockPoints = vi.fn();
      const mockArrowNode = {
        points: mockPoints,
        stroke: vi.fn(),
        fill: vi.fn(),
        strokeWidth: vi.fn(),
        opacity: vi.fn(),
        visible: vi.fn(),
      } as any;

      registry.arrowNodes.set('arr-dot', {
        node: mockArrowNode,
      });

      // sPx: (100, 100), ePx: (300, 100)
      // No strokeWidth provided -> default 6px dotRadius
      updateArrowNodes(
        {
          'arr-dot': {
            id: 'arr-dot',
            arrowType: 'pass',
            endMarker: 'dot',
            points: [
              { x: 10, y: 20 },
              { x: 30, y: 20 },
            ],
            curveType: 'straight',
            color: '#ffffff',
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

      // Points shortened by 6px
      expect(mockPoints).toHaveBeenCalledWith([106, 100, 294, 100]);
    });

    it('preserves endMarker during interpolateArrow', () => {
      const arrowA = {
        id: 'arr-dot',
        annotationType: 'arrow' as const,
        arrowType: 'route_line' as const,
        curveType: 'straight' as const,
        points: [
          { x: 10, y: 20 },
          { x: 30, y: 20 },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: false,
        endMarker: 'dot' as const,
      };

      const arrowB = {
        ...arrowA,
        points: [
          { x: 20, y: 30 },
          { x: 40, y: 30 },
        ],
      };

      const interpolated = interpolateArrow(arrowA, arrowB, 0.5);
      expect(interpolated).not.toBeNull();
      expect(interpolated?.endMarker).toBe('dot');
    });

    it('positions rect zones at center cx/cy with offsetX/offsetY to match static ZoneShapeNode', () => {
      const registry = createCanvasNodesRegistry();
      const mockPos = vi.fn();
      const mockWidth = vi.fn();
      const mockHeight = vi.fn();
      const mockOffsetX = vi.fn();
      const mockOffsetY = vi.fn();

      const mockRectNode = {
        position: mockPos,
        width: mockWidth,
        height: mockHeight,
        offsetX: mockOffsetX,
        offsetY: mockOffsetY,
        rotation: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        strokeWidth: vi.fn(),
        visible: vi.fn(),
        opacity: vi.fn(),
      } as any;

      registry.zoneNodes.set('z1', mockRectNode);

      // normX: 20, normY: 30, normW: 40, normH: 20 on 1000x500 canvas
      // pxW = 0.4 * 1000 = 400, pxH = 0.2 * 500 = 100
      // cx = (0.2 * 1000) + 400 / 2 = 200 + 200 = 400
      // cy = (0.3 * 500) + 100 / 2 = 150 + 50 = 200
      updateZoneNodes(
        {
          z1: {
            id: 'z1',
            zoneType: 'highlight',
            shapeType: 'rect',
            x: 20,
            y: 30,
            width: 40,
            height: 20,
            points: [],
            color: '#22c55e',
            opacity: 0.25,
            strokeWidth: 2,
            visible: true,
          },
        },
        registry,
        1000,
        500,
        0,
        0,
      );

      expect(mockPos).toHaveBeenCalledWith({ x: 400, y: 200 });
      expect(mockWidth).toHaveBeenCalledWith(400);
      expect(mockHeight).toHaveBeenCalledWith(100);
      expect(mockOffsetX).toHaveBeenCalledWith(200);
      expect(mockOffsetY).toHaveBeenCalledWith(50);
    });
  });
});
