import { render } from '@testing-library/react';
import type Konva from 'konva';
import { createRef } from 'react';
import { Layer, Stage } from 'react-konva';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
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
});
