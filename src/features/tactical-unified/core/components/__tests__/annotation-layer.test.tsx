import { act, render } from '@testing-library/react';
import type Konva from 'konva';
import React from 'react';
import { Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasStoreProvider } from '../../store/canvas-store-provider';
import { AnnotationLayer } from '../AnnotationLayer';
import { DrawingPreviewLayer } from '../DrawingPreviewLayer';
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

function renderWithStore(ui: React.ReactElement, initialAnnotations?: string) {
  const stageRef = React.createRef<Konva.Stage>();
  render(
    <CanvasStoreProvider
      config={{
        mode: 'screenshot-edit',
        markerMode: '3d-only',
        initialAnnotations,
      }}
    >
      <Stage ref={stageRef} width={W} height={H}>
        {ui}
      </Stage>
    </CanvasStoreProvider>,
  );
  return stageRef;
}

describe('多角形ゾーン描画', () => {
  it('多角形ゾーン（shapeType: "polygon"）が Konva Line として正確にレンダリングされること', () => {
    const raw = JSON.stringify({
      arrows: [],
      zones: [
        {
          id: 'poly-1',
          shapeType: 'polygon',
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 10 },
            { x: 30, y: 40 },
          ],
          color: '#3b82f6',
          isComplete: true,
        },
      ],
      texts: [],
      markers: [],
    });
    const stageRef = renderWithStore(
      <AnnotationLayer width={W} height={H} />,
      raw,
    );
    const lines = stageRef.current?.find<Konva.Line>('Line') ?? [];
    const polyLine = lines.find((l) => l.attrs.closed === true);
    expect(polyLine).toBeDefined();
    expect(polyLine?.points()).toEqual([80, 60, 400, 60, 240, 240]);
  });
});

describe('矢印描画 & 制御点', () => {
  it('矢印選択時にベジェ制御点ハンドルが表示され、ドラッグで形状変化すること', () => {
    const raw = JSON.stringify({
      arrows: [
        {
          id: 'arrow-curved-1',
          curveType: 'curved',
          points: [
            { x: 20, y: 20 },
            { x: 80, y: 80 },
          ],
          controlPoint: { x: 50, y: 20 },
          color: '#3b82f6',
          strokeWidth: 3,
          dashArray: [],
        },
      ],
      zones: [],
      texts: [],
      markers: [],
    });
    const stageRef = renderWithStore(
      <AnnotationLayer width={W} height={H} />,
      raw,
    );
    const arrowNode = stageRef.current?.find<Konva.Arrow>('Arrow')[0];
    expect(arrowNode).toBeDefined();

    act(() => {
      arrowNode?.fire('click', { cancelBubble: false, evt: {} });
    });

    const circles = stageRef.current?.find<Konva.Circle>('Circle') ?? [];
    const controlHandle = circles.find((c) => c.attrs.fill === '#f59e0b');
    expect(controlHandle).toBeDefined();
    expect(controlHandle?.attrs.visible).toBe(true);

    act(() => {
      controlHandle?.position({ x: 450, y: 200 });
      controlHandle?.fire('dragend', {
        cancelBubble: false,
        target: controlHandle,
      });
    });
  });

  it('波線矢印（arrow_wavy）で正弦波の頂点が描画されること', () => {
    const raw = JSON.stringify({
      arrows: [
        {
          id: 'arrow-wavy-1',
          arrowType: 'dribble',
          points: [
            { x: 10, y: 50 },
            { x: 90, y: 50 },
          ],
          color: '#fbbf24',
          strokeWidth: 3,
          dashArray: [],
        },
      ],
      zones: [],
      texts: [],
      markers: [],
    });
    const stageRef = renderWithStore(
      <AnnotationLayer width={W} height={H} />,
      raw,
    );
    const arrowNode = stageRef.current?.find<Konva.Arrow>('Arrow')[0];
    expect(arrowNode).toBeDefined();
    expect(arrowNode?.points().length).toBeGreaterThan(10);
  });
});

describe('プレイヤー & テキスト & プレビュー描画', () => {
  it('3D足元リングマーカーに背番号およびチームカラーが反映されること', () => {
    const raw = JSON.stringify({
      arrows: [],
      zones: [],
      texts: [],
      markers: [
        {
          id: 'player-1',
          shirtNo: '20',
          x: 50,
          y: 60,
          team: 'home',
          area: 'pitch',
          style: {
            color: '#001489',
            markerType: 'ring',
            insideContent: 'number',
          },
          badges: [],
        },
      ],
    });
    const stageRef = renderWithStore(<PlayerLayer width={W} height={H} />, raw);
    const texts = stageRef.current?.find<Konva.Text>('Text') ?? [];
    expect(texts.find((t) => t.text() === '20')).toBeDefined();

    const ellipses = stageRef.current?.find<Konva.Ellipse>('Ellipse') ?? [];
    expect(ellipses.find((e) => e.attrs.stroke === '#001489')).toBeDefined();
  });

  it('テキストオブジェクトをダブルクリックで onStartEditText が発火すること', () => {
    const onStartEditText = vi.fn();
    const raw = JSON.stringify({
      arrows: [],
      zones: [],
      texts: [
        {
          id: 'text-1',
          content: 'Tactical',
          x: 25,
          y: 25,
          color: '#fff',
          fontSize: 20,
        },
      ],
      markers: [],
    });
    const stageRef = renderWithStore(
      <AnnotationLayer
        width={W}
        height={H}
        onStartEditText={onStartEditText}
      />,
      raw,
    );
    const textNode = stageRef.current
      ?.find<Konva.Text>('Text')
      .find((t) => t.text() === 'Tactical');
    expect(textNode).toBeDefined();

    act(() => {
      textNode?.fire('dblclick', { cancelBubble: false, evt: {} });
    });
    expect(onStartEditText).toHaveBeenCalledWith('text-1');
  });

  it('DrawingPreviewLayer で範囲選択枠が描画されること', () => {
    const stageRef = renderWithStore(
      <DrawingPreviewLayer
        width={W}
        height={H}
        selectionBox={{
          startX: 100,
          startY: 100,
          currentX: 300,
          currentY: 250,
          isShift: false,
        }}
      />,
    );
    const rects = stageRef.current?.find<Konva.Rect>('Rect') ?? [];
    const selRect = rects.find(
      (r) => r.attrs.stroke === '#38bdf8' && r.attrs.width === 200,
    );
    expect(selRect).toBeDefined();
    expect(selRect?.height()).toBe(150);
  });
});
