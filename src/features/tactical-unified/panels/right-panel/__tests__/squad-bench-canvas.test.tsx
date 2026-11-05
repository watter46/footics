import { render } from '@testing-library/react';
import Konva from 'konva';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerPhotoProvider } from '@/features/tactical-unified/core';
import { SquadBenchCanvas } from '@/features/tactical-unified/panels/right-panel/squad-bench-canvas';
import { createDefaultPlayer, type Player } from '@/lib/types/tactical-unified';

beforeEach(() => {
  vi.clearAllMocks();
  // Konva stage cleanup
  while (Konva.stages.length > 0) {
    const stage = Konva.stages[0];
    stage.destroy();
  }

  const mockCtx = new Proxy(
    {
      getImageData: () => ({ data: new Array(4) }),
      createImageData: () => [],
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      measureText: () => ({ width: 0 }),
      getLineDash: () => [],
      isPointInPath: () => true,
      createRadialGradient: () => ({
        addColorStop: vi.fn(),
      }),
    } as Record<string, unknown>,
    {
      get: (target, prop: string) => (prop in target ? target[prop] : vi.fn()),
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
});

describe('SquadBenchCanvas Player Photo Display', () => {
  it('renders Konva Image when wrapped in PlayerPhotoProvider and photo is resolved', () => {
    const dummyImage = new Image();
    const photos = new Map<string, HTMLImageElement>([['bench-1', dummyImage]]);

    const benchPlayer: Player = {
      ...createDefaultPlayer('home', 20, 20, '#38bdf8'),
      id: 'bench-1',
      name: 'Kevin De Bruyne',
      shirtNo: '17',
      area: 'bench',
      style: {
        ...createDefaultPlayer('home', 20, 20, '#38bdf8').style,
        insideContent: 'photo',
      },
    };

    const containerRef = createRef<HTMLDivElement>();

    render(
      <PlayerPhotoProvider photos={photos}>
        <SquadBenchCanvas
          benchPlayers={[benchPlayer]}
          selectedIds={[]}
          containerRef={containerRef}
          canvasWidth={320}
          stageHeight={280}
          onDragStart={vi.fn()}
          onDragEnd={vi.fn()}
          onClick={vi.fn()}
        />
      </PlayerPhotoProvider>,
    );

    const stage = Konva.stages[Konva.stages.length - 1];
    expect(stage).toBeDefined();

    const images = stage.find('Image');
    expect(images.length).toBe(1);
    expect((images[0] as Konva.Image).image()).toBe(dummyImage);
  });

  it('falls back to shirt number text when PlayerPhotoProvider is absent', () => {
    const benchPlayer: Player = {
      ...createDefaultPlayer('home', 20, 20, '#38bdf8'),
      id: 'bench-1',
      name: 'Kevin De Bruyne',
      shirtNo: '10',
      area: 'bench',
      style: {
        ...createDefaultPlayer('home', 20, 20, '#38bdf8').style,
        insideContent: 'photo',
      },
    };

    const containerRef = createRef<HTMLDivElement>();

    render(
      <SquadBenchCanvas
        benchPlayers={[benchPlayer]}
        selectedIds={[]}
        containerRef={containerRef}
        canvasWidth={320}
        stageHeight={280}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        onClick={vi.fn()}
      />,
    );

    const stage = Konva.stages[Konva.stages.length - 1];
    expect(stage).toBeDefined();

    // No Image should be rendered
    const images = stage.find('Image');
    expect(images.length).toBe(0);

    // Shirt number text should be rendered
    const texts = stage.find('Text');
    const shirtNoText = texts.find((t) => (t as Konva.Text).text() === '10');
    expect(shirtNoText).toBeDefined();
  });
});
