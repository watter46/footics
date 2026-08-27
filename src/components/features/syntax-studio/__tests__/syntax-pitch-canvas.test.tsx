import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TacticalScene } from '@/lib/types/syntax-integration';
import { useSyntaxStudioStore } from '@/stores/syntax-studio-store';
import { SyntaxPitchCanvas } from '../syntax-pitch-canvas';

const mockScene: TacticalScene = {
  id: 'scene-1',
  title: 'High Press Structure',
  description: '4-3-3 high press setup',
  players: [
    { id: 'p1', team: 'home', jerseyNumber: 9, x: 50, y: 30, annotation: 'CF' },
    {
      id: 'p2',
      team: 'home',
      jerseyNumber: 10,
      x: 45,
      y: 55,
      annotation: 'CAM',
    },
    { id: 'p3', team: 'away', jerseyNumber: 4, x: 50, y: 20, annotation: 'CB' },
  ],
  arrows: [
    {
      id: 'arrow-1',
      type: 'move',
      startX: 50,
      startY: 30,
      endX: 50,
      endY: 22,
    },
    {
      id: 'arrow-2',
      type: 'pass',
      startX: 50,
      startY: 20,
      endX: 70,
      endY: 20,
    },
  ],
  zones: [
    {
      id: 'zone-1',
      type: 'danger',
      points: [
        { x: 40, y: 15 },
        { x: 60, y: 15 },
        { x: 60, y: 25 },
        { x: 40, y: 25 },
      ],
    },
  ],
};

// Canvas 2D context mock for happy-dom
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
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
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    isPointInPath: vi.fn(() => true),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(),
  });
});

describe('SyntaxPitchCanvas', () => {
  beforeEach(() => {
    useSyntaxStudioStore.setState({
      viewMode: 'split',
      currentSceneIndex: 0,
      aiDraft: { version: '1.0.0', tacticalScenes: [mockScene] },
      humanGroundTruth: { version: '1.0.0', tacticalScenes: [mockScene] },
      matchMetadata: null,
      datasetId: 'test_dataset',
    });
  });

  it('renders correctly in readOnly mode', () => {
    const { container } = render(
      <SyntaxPitchCanvas
        mode="readOnly"
        scene={mockScene}
        width={800}
        height={500}
      />,
    );
    expect(container).toBeDefined();
    expect(container.querySelector('.konvajs-content')).toBeDefined();
  });

  it('renders correctly in interactive mode', () => {
    const { container } = render(
      <SyntaxPitchCanvas
        mode="interactive"
        scene={mockScene}
        width={800}
        height={500}
      />,
    );
    expect(container).toBeDefined();
    expect(container.querySelector('.konvajs-content')).toBeDefined();
  });

  it('updates ground truth player position in store', () => {
    const store = useSyntaxStudioStore.getState();
    store.updateGroundTruthPlayerPosition('scene-1', 'p1', 65.5, 42.0);

    const updatedTruth = useSyntaxStudioStore.getState().humanGroundTruth;
    const player = updatedTruth?.tacticalScenes[0]?.players.find(
      (p) => p.id === 'p1',
    );
    expect(player?.x).toBe(65.5);
    expect(player?.y).toBe(42.0);
  });
});
