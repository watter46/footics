import { render } from '@testing-library/react';
import type Konva from 'konva';
import { createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type PlayerPhotoMap,
  PlayerPhotoProvider,
} from '@/features/tactical-unified/core/hooks/player-photo-context';
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { PlayerMarkerItem } from '../PlayerMarkerItem';

beforeEach(() => {
  vi.clearAllMocks();
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

describe('PlayerMarkerItem vertical scale', () => {
  it('aspectRatio が 16:9 のときは通常スケール (1.0) の半径になる', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = createDefaultPlayer('home', 50, 50, '#ff0000');
    const width = 800;
    const height = 450;
    const baseDim = 450;

    render(
      <Stage ref={stageRef} width={width} height={height}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={width}
            height={height}
            baseDim={baseDim}
            markerMode="2d-only"
            aspectRatio="16:9"
            isSelected={false}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const circle = stageRef.current?.findOne('Circle') as Konva.Circle | null;
    expect(circle).not.toBeNull();
    // baseDim * 0.032 * 1.0 = 450 * 0.032 = 14.4
    expect(circle?.radius()).toBeCloseTo(baseDim * 0.032, 2);
  });

  it('aspectRatio が 4:5 または 9:16 のときは 0.85 倍に縮小された半径になる', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = createDefaultPlayer('home', 50, 50, '#ff0000');
    const width = 480;
    const height = 600;
    const baseDim = 480;

    render(
      <Stage ref={stageRef} width={width} height={height}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={width}
            height={height}
            baseDim={baseDim}
            markerMode="2d-only"
            aspectRatio="4:5"
            isSelected={false}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const circle = stageRef.current?.findOne('Circle') as Konva.Circle | null;
    expect(circle).not.toBeNull();
    // baseDim * 0.032 * 0.85
    expect(circle?.radius()).toBeCloseTo(baseDim * 0.032 * 0.85, 2);
  });

  it('markerMode="3d-only" かつ name: "Saka" の 3Dマーカー下部に "Saka" の Konva Text が描画されること', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#ff0000'),
      name: 'Bukayo Saka',
      style: {
        ...createDefaultPlayer('home', 50, 50, '#ff0000').style,
        markerType: 'ring' as const,
        bottomLabel: 'none' as const,
      },
    };
    const width = 800;
    const height = 450;
    const baseDim = 450;

    render(
      <Stage ref={stageRef} width={width} height={height}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={width}
            height={height}
            baseDim={baseDim}
            markerMode="3d-only"
            aspectRatio="16:9"
            isSelected={false}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const texts = stageRef.current?.find('Text') as Konva.Text[];
    const nameText = texts.find((t) => t.text() === 'Saka');
    expect(nameText).toBeDefined();
    expect(nameText?.text()).toBe('Saka');
  });

  it('PlayerMarkerCircle renders shirt number with verticalAlign="middle", height={radius*2}, y={-radius}', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#ff0000'),
      shirtNo: '9',
      style: {
        ...createDefaultPlayer('home', 50, 50, '#ff0000').style,
        insideContent: 'number' as const,
      },
    };
    const width = 800;
    const height = 450;
    const baseDim = 450;

    render(
      <Stage ref={stageRef} width={width} height={height}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={width}
            height={height}
            baseDim={baseDim}
            markerMode="2d-only"
            aspectRatio="16:9"
            isSelected={false}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const texts = stageRef.current?.find('Text') as Konva.Text[];
    const numText = texts.find((t) => t.text() === '9');
    expect(numText).toBeDefined();
    expect(numText?.verticalAlign()).toBe('middle');
    const radius = baseDim * 0.032;
    expect(numText?.height()).toBeCloseTo(radius * 2, 1);
    expect(numText?.y()).toBeCloseTo(-radius, 1);
  });

  it('PlayerMarkerRing does not render shirt number in center (center text is removed)', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#ff0000'),
      shirtNo: '10',
      style: {
        ...createDefaultPlayer('home', 50, 50, '#ff0000').style,
        markerType: 'ring' as const,
        insideContent: 'number' as const,
      },
    };
    const width = 800;
    const height = 450;
    const baseDim = 450;

    render(
      <Stage ref={stageRef} width={width} height={height}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={width}
            height={height}
            baseDim={baseDim}
            markerMode="3d-only"
            aspectRatio="16:9"
            isSelected={false}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const texts = stageRef.current?.find('Text') as Konva.Text[];
    const numText = texts.find((t) => t.text() === '10');
    expect(numText).toBeUndefined();
  });

  it('PlayerPhotoProvider で写真が提供され insideContent: "photo" の場合、Konva Image が描画される', () => {
    const fakeImage = {
      width: 100,
      height: 100,
    } as unknown as HTMLImageElement;
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#ff0000'),
      playerId: '12345',
      shirtNo: '7',
      style: {
        ...createDefaultPlayer('home', 50, 50, '#ff0000').style,
        insideContent: 'photo' as const,
      },
    };
    const key = getPlayerPhotoKey(marker);
    const photos: PlayerPhotoMap = new Map([[key, fakeImage]]);
    const width = 800;
    const height = 450;
    const baseDim = 450;

    render(
      <PlayerPhotoProvider photos={photos}>
        <Stage ref={stageRef} width={width} height={height}>
          <Layer>
            <PlayerMarkerItem
              marker={marker}
              width={width}
              height={height}
              baseDim={baseDim}
              markerMode="2d-only"
              aspectRatio="16:9"
              isSelected={false}
              isInteractive={true}
              connectingPlayerId={null}
              onDragStart={vi.fn()}
              onDragMove={vi.fn()}
              onDragEnd={vi.fn()}
              onClick={vi.fn()}
              onUpdateVisionCone={vi.fn()}
            />
          </Layer>
        </Stage>
      </PlayerPhotoProvider>,
    );

    const konvaImages = stageRef.current?.find('Image') as Konva.Image[];
    expect(konvaImages.length).toBeGreaterThan(0);
    expect(konvaImages[0].image()).toBe(fakeImage);
  });

  it('PlayerPhotoProvider が無い場合、背番号テキストが描画されエラーにならない', () => {
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#ff0000'),
      playerId: '12345',
      shirtNo: '7',
      style: {
        ...createDefaultPlayer('home', 50, 50, '#ff0000').style,
        insideContent: 'photo' as const,
      },
    };
    const width = 800;
    const height = 450;
    const baseDim = 450;

    render(
      <Stage ref={stageRef} width={width} height={height}>
        <Layer>
          <PlayerMarkerItem
            marker={marker}
            width={width}
            height={height}
            baseDim={baseDim}
            markerMode="2d-only"
            aspectRatio="16:9"
            isSelected={false}
            isInteractive={true}
            connectingPlayerId={null}
            onDragStart={vi.fn()}
            onDragMove={vi.fn()}
            onDragEnd={vi.fn()}
            onClick={vi.fn()}
            onUpdateVisionCone={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const texts = stageRef.current?.find('Text') as Konva.Text[];
    const numText = texts.find((t) => t.text() === '7');
    expect(numText).toBeDefined();
  });

  it('insideContent !== "photo" の場合、Context に写真があっても背番号テキストが描画される', () => {
    const fakeImage = {
      width: 100,
      height: 100,
    } as unknown as HTMLImageElement;
    const stageRef = createRef<Konva.Stage>();
    const marker = {
      ...createDefaultPlayer('home', 50, 50, '#ff0000'),
      playerId: '12345',
      shirtNo: '7',
      style: {
        ...createDefaultPlayer('home', 50, 50, '#ff0000').style,
        insideContent: 'number' as const,
      },
    };
    const key = getPlayerPhotoKey(marker);
    const photos: PlayerPhotoMap = new Map([[key, fakeImage]]);
    const width = 800;
    const height = 450;
    const baseDim = 450;

    render(
      <PlayerPhotoProvider photos={photos}>
        <Stage ref={stageRef} width={width} height={height}>
          <Layer>
            <PlayerMarkerItem
              marker={marker}
              width={width}
              height={height}
              baseDim={baseDim}
              markerMode="2d-only"
              aspectRatio="16:9"
              isSelected={false}
              isInteractive={true}
              connectingPlayerId={null}
              onDragStart={vi.fn()}
              onDragMove={vi.fn()}
              onDragEnd={vi.fn()}
              onClick={vi.fn()}
              onUpdateVisionCone={vi.fn()}
            />
          </Layer>
        </Stage>
      </PlayerPhotoProvider>,
    );

    const texts = stageRef.current?.find('Text') as Konva.Text[];
    const numText = texts.find((t) => t.text() === '7');
    expect(numText).toBeDefined();

    const konvaImages = stageRef.current?.find('Image') as Konva.Image[];
    expect(konvaImages.length).toBe(0);
  });
});
