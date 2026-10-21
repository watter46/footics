import { describe, expect, it, vi } from 'vitest';
import { createCanvasNodesRegistry } from '@/features/tactical-unified/core';
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
});
