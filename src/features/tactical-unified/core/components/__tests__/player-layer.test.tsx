import { render } from '@testing-library/react';
import type Konva from 'konva';
import React from 'react';
import { Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { CanvasStoreProvider } from '../../store/canvas-store-provider';
import { PlayerLayer } from '../PlayerLayer';

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    isPointInPath: vi.fn(() => true),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createPattern: vi.fn(),
  });
});

const W = 800;
const H = 600;

function renderPlayerLayer(initialAnnotations?: string) {
  const stageRef = React.createRef<Konva.Stage>();
  const renderResult = render(
    <CanvasStoreProvider
      config={{
        mode: 'screenshot-edit',
        markerMode: '2d-only',
        initialAnnotations,
      }}
    >
      <Stage ref={stageRef} width={W} height={H}>
        <PlayerLayer width={W} height={H} />
      </Stage>
    </CanvasStoreProvider>,
  );
  return { stageRef, ...renderResult };
}

describe('PlayerLayer teamVisibility filtering', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setTeamVisibility('both');
  });

  const rawMarkers = JSON.stringify({
    arrows: [],
    zones: [],
    texts: [],
    markers: [
      {
        id: 'home-1',
        shirtNo: '9',
        x: 30,
        y: 50,
        team: 'home',
        area: 'pitch',
        style: { color: '#001489', markerType: 'circle' },
      },
      {
        id: 'away-1',
        shirtNo: '10',
        x: 70,
        y: 50,
        team: 'away',
        area: 'pitch',
        style: { color: '#da020e', markerType: 'circle' },
      },
      {
        id: 'neutral-1',
        shirtNo: 'REF',
        x: 50,
        y: 50,
        team: 'neutral',
        area: 'pitch',
        style: { color: '#ffff00', markerType: 'circle' },
      },
    ],
  });

  it('renders all markers when teamVisibility is both', () => {
    useTacticalUnifiedStore.getState().setTeamVisibility('both');
    const { stageRef } = renderPlayerLayer(rawMarkers);

    const texts = stageRef.current?.find<Konva.Text>('Text') ?? [];
    const textValues = texts.map((t) => t.text());
    expect(textValues).toContain('9');
    expect(textValues).toContain('10');
    expect(textValues).toContain('REF');
  });

  it('renders only home and neutral markers when teamVisibility is home', () => {
    useTacticalUnifiedStore.getState().setTeamVisibility('home');
    const { stageRef } = renderPlayerLayer(rawMarkers);

    const texts = stageRef.current?.find<Konva.Text>('Text') ?? [];
    const textValues = texts.map((t) => t.text());
    expect(textValues).toContain('9');
    expect(textValues).not.toContain('10');
    expect(textValues).toContain('REF');
  });

  it('renders only away and neutral markers when teamVisibility is away', () => {
    useTacticalUnifiedStore.getState().setTeamVisibility('away');
    const { stageRef } = renderPlayerLayer(rawMarkers);

    const texts = stageRef.current?.find<Konva.Text>('Text') ?? [];
    const textValues = texts.map((t) => t.text());
    expect(textValues).not.toContain('9');
    expect(textValues).toContain('10');
    expect(textValues).toContain('REF');
  });
});
