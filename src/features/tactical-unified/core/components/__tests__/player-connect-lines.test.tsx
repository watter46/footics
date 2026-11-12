import { render } from '@testing-library/react';
import type Konva from 'konva';
import { createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import type {
  ResolvedBillboardTextItem,
  ResolvedConnectLinePrimitive,
} from '@/lib/tactical/compiler/scene-graph-dto';
import type { TextAnnotation } from '@/lib/types/tactical-unified';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { CanvasStoreProvider } from '../../store/canvas-store-provider';
import type { CanvasNodesRegistry } from '../../utils/canvas-registry';
import { TextObject } from '../annotations/TextObject';
import { PlayerConnectLines } from '../PlayerConnectLines';

describe('PlayerConnectLines', () => {
  it('多層フォグ減衰（広域＋中間＋コアライン）と glowBlur / glowOpacity が反映される', () => {
    const stageRef = createRef<Konva.Stage>();
    const nodeMapRef = { current: new Map<string, Konva.Line>() };

    const p1 = {
      ...createDefaultPlayer('home', 20, 20, '#034694'),
      id: 'p1',
      connectLines: [
        {
          id: 'cl-1',
          toPlayerId: 'p2',
          lineStyle: 'solid' as const,
          color: '#ffffff',
          strokeWidth: 3,
          glowBlur: 50,
          glowOpacity: 0.8,
          visible: true,
        },
      ],
    };
    const p2 = {
      ...createDefaultPlayer('home', 80, 80, '#034694'),
      id: 'p2',
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerConnectLines
            markers={[p1, p2]}
            width={800}
            height={450}
            selectedIds={[]}
            isInteractive={true}
            connectLineNodesRef={nodeMapRef}
            onSelectConnectLine={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const coreLine = nodeMapRef.current.get('cl-1');
    expect(coreLine).toBeDefined();
    // コアライン: glowBlur * 0.35 = 17.5
    expect(coreLine?.shadowBlur()).toBeCloseTo(17.5);

    const fogA = nodeMapRef.current.get('cl-1-fog-a');
    expect(fogA).toBeDefined();
    // 広域フォグ: glowBlur * 1.5 = 75, opacity = 0.8 * 0.25 = 0.2
    expect(fogA?.shadowBlur()).toBeCloseTo(75);
    expect(fogA?.opacity()).toBeCloseTo(0.2);

    const fogB = nodeMapRef.current.get('cl-1-fog-b');
    expect(fogB).toBeDefined();
    // 中間フォグ: glowBlur * 0.8 = 40, opacity = 0.8 * 0.55 = 0.44
    expect(fogB?.shadowBlur()).toBeCloseTo(40);
    expect(fogB?.opacity()).toBeCloseTo(0.44);
  });

  it('cl.glowBlur が未指定の場合、デフォルトの 50 が shadowBlur に適用される', () => {
    const stageRef = createRef<Konva.Stage>();
    const nodeMapRef = { current: new Map<string, Konva.Line>() };

    const p1 = {
      ...createDefaultPlayer('home', 20, 20, '#034694'),
      id: 'p1',
      connectLines: [
        {
          id: 'cl-2',
          toPlayerId: 'p2',
          lineStyle: 'solid' as const,
          color: '#ffffff',
          strokeWidth: 3,
          visible: true,
        },
      ],
    };
    const p2 = {
      ...createDefaultPlayer('home', 80, 80, '#034694'),
      id: 'p2',
    };

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerConnectLines
            markers={[p1, p2]}
            width={800}
            height={450}
            selectedIds={[]}
            isInteractive={true}
            connectLineNodesRef={nodeMapRef}
            onSelectConnectLine={vi.fn()}
          />
        </Layer>
      </Stage>,
    );

    const line = nodeMapRef.current.get('cl-2');
    expect(line).toBeDefined();
    // コアライン: デフォルト 50 * 0.35 = 17.5
    expect(line?.shadowBlur()).toBeCloseTo(17.5);
  });

  it('resolvedConnectLines が指定されている場合、markers からの座標探索をスキップして DTO 値を描画する', () => {
    const stageRef = createRef<Konva.Stage>();
    const nodeMapRef = { current: new Map<string, Konva.Line>() };
    const onSelectConnectLine = vi.fn();

    const resolvedConnectLines: ResolvedConnectLinePrimitive[] = [
      {
        id: 'cl-1',
        fromPlayerId: 'p1',
        toPlayerId: 'p2',
        flatPointsPx: [100, 120, 300, 240],
        color: '#22c55e',
        strokeWidthPx: 3,
        dashArrayPx: [8, 4],
        visible: true,
      },
    ];

    render(
      <Stage ref={stageRef} width={800} height={450}>
        <Layer>
          <PlayerConnectLines
            markers={[]}
            width={800}
            height={450}
            selectedIds={[]}
            isInteractive={true}
            connectLineNodesRef={nodeMapRef}
            onSelectConnectLine={onSelectConnectLine}
            resolvedConnectLines={resolvedConnectLines}
          />
        </Layer>
      </Stage>,
    );

    const line = nodeMapRef.current.get('cl-1');
    expect(line).toBeDefined();
    expect(line?.points()).toEqual([100, 120, 300, 240]);
    expect(line?.stroke()).toBe('#22c55e');
    expect(line?.strokeWidth()).toBe(3);
    expect(line?.dash()).toEqual([8, 4]);

    line?.fire('click', { cancelBubble: false });
    expect(onSelectConnectLine).toHaveBeenCalledWith('cl-1', 'p1');
  });

  it('TextObject: resolvedText が渡されたとき、positionPx, fontSizePx, opacity が優先適用される', () => {
    const stageRef = createRef<Konva.Stage>();
    const textNodes = new Map<string, Konva.Text>();
    const nodesRegistryRef = {
      current: { textNodes } as unknown as CanvasNodesRegistry,
    };

    const textAnnotation: TextAnnotation = {
      id: 't-1',
      annotationType: 'text',
      x: 10,
      y: 10,
      content: 'Old Content',
      fontSize: 14,
      color: '#ffffff',
      bold: false,
      italic: false,
    };

    const resolvedText: ResolvedBillboardTextItem = {
      kind: 'text',
      id: 't-1',
      positionPx: {
        x: 420 as unknown as number,
        y: 180 as unknown as number,
      } as any,
      depthSortKey: 180,
      content: 'High Press',
      fontSizePx: 24,
      color: '#ffffff',
      bold: true,
      italic: false,
      opacity: 0.85,
      visible: true,
      selected: false,
    };

    render(
      <CanvasStoreProvider config={{} as any}>
        <Stage ref={stageRef} width={800} height={450}>
          <Layer>
            <TextObject
              text={textAnnotation}
              stageSize={{ width: 800, height: 450 }}
              isSelected={false}
              onSelect={vi.fn()}
              onDblClick={vi.fn()}
              updateText={vi.fn()}
              nodesRegistryRef={nodesRegistryRef}
              resolvedText={resolvedText}
            />
          </Layer>
        </Stage>
      </CanvasStoreProvider>,
    );

    const textNode = textNodes.get('t-1');
    expect(textNode).toBeDefined();
    expect(textNode?.x()).toBe(420);
    expect(textNode?.y()).toBe(180);
    expect(textNode?.fontSize()).toBe(24);
    expect(textNode?.opacity()).toBeCloseTo(0.85);
  });
});
