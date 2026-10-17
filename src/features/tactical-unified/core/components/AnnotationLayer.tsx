'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import {
  Group,
  Arrow as KonvaArrow,
  Rect as KonvaRect,
  Text as KonvaText,
  Layer,
} from 'react-konva';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';

export interface AnnotationLayerProps {
  width: number;
  height: number;
}

function ZonesGroup({
  width,
  height,
}: {
  width: number;
  height: number;
}): ReactNode {
  const zones = useCanvasStore((s) => s.annotations.zones);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateZone = useCanvasStore((s) => s.updateZone);
  const isInteractive = activeTool === 'select';

  return (
    <>
      {zones.map((zone) => {
        const zX = zone.x ?? 0;
        const zY = zone.y ?? 0;
        const zW = zone.width ?? 0;
        const zH = zone.height ?? 0;
        const pxX = (zX / 100) * width;
        const pxY = (zY / 100) * height;
        const pxW = (zW / 100) * width;
        const pxH = (zH / 100) * height;
        const isSelected = selectedIds.includes(zone.id);

        return (
          <Group
            key={zone.id}
            x={pxX}
            y={pxY}
            draggable={isInteractive}
            onClick={(e) => {
              e.cancelBubble = true;
              selectObject(zone.id, (e.evt as MouseEvent)?.shiftKey ?? false);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              selectObject(zone.id, false);
            }}
            onDragEnd={(e) => {
              const node = e.target;
              updateZone(zone.id, {
                x: Math.max(0, Math.min(100, (node.x() / width) * 100)),
                y: Math.max(0, Math.min(100, (node.y() / height) * 100)),
              });
            }}
          >
            <KonvaRect
              width={pxW}
              height={pxH}
              fill={zone.color}
              opacity={zone.opacity ?? 0.25}
              stroke={isSelected ? '#60a5fa' : zone.color}
              strokeWidth={isSelected ? 3 : 2}
              cornerRadius={6}
            />
          </Group>
        );
      })}
    </>
  );
}

function ArrowsGroup({
  width,
  height,
}: {
  width: number;
  height: number;
}): ReactNode {
  const arrows = useCanvasStore((s) => s.annotations.arrows);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateArrow = useCanvasStore((s) => s.updateArrow);
  const isInteractive = activeTool === 'select';

  const handleArrowDragEnd = useCallback(
    (arrow: ArrowAnnotation, dxNorm: number, dyNorm: number) => {
      const nextPoints = arrow.points.map((pt) => ({
        x: pt.x + dxNorm,
        y: pt.y + dyNorm,
      }));
      updateArrow(arrow.id, { points: nextPoints });
    },
    [updateArrow],
  );

  return (
    <>
      {arrows.map((arrow) => {
        const isSelected = selectedIds.includes(arrow.id);
        const pxPoints = arrow.points.flatMap((pt) => [
          (pt.x / 100) * width,
          (pt.y / 100) * height,
        ]);

        return (
          <Group
            key={arrow.id}
            draggable={isInteractive}
            onClick={(e) => {
              e.cancelBubble = true;
              selectObject(arrow.id, (e.evt as MouseEvent)?.shiftKey ?? false);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              selectObject(arrow.id, false);
            }}
            onDragEnd={(e) => {
              const node = e.target;
              const dxNorm = (node.x() / width) * 100;
              const dyNorm = (node.y() / height) * 100;
              node.position({ x: 0, y: 0 });
              handleArrowDragEnd(arrow, dxNorm, dyNorm);
            }}
          >
            <KonvaArrow
              points={pxPoints}
              stroke={isSelected ? '#60a5fa' : arrow.color}
              strokeWidth={
                isSelected ? arrow.strokeWidth + 2 : arrow.strokeWidth
              }
              fill={isSelected ? '#60a5fa' : arrow.color}
              pointerLength={10}
              pointerWidth={10}
              dash={arrow.dashArray.length > 0 ? arrow.dashArray : undefined}
              pointerAtBeginning={arrow.startMarker === 'arrow'}
              pointerAtEnding={arrow.arrowHead !== false}
              lineCap="round"
              lineJoin="round"
            />
          </Group>
        );
      })}
    </>
  );
}

function TextsGroup({
  width,
  height,
}: {
  width: number;
  height: number;
}): ReactNode {
  const texts = useCanvasStore((s) => s.annotations.texts);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const updateText = useCanvasStore((s) => s.updateText);
  const isInteractive = activeTool === 'select';

  return (
    <>
      {texts.map((text) => {
        const pxX = (text.x / 100) * width;
        const pxY = (text.y / 100) * height;
        const isSelected = selectedIds.includes(text.id);

        return (
          <Group
            key={text.id}
            x={pxX}
            y={pxY}
            draggable={isInteractive}
            onClick={(e) => {
              e.cancelBubble = true;
              selectObject(text.id, (e.evt as MouseEvent)?.shiftKey ?? false);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              selectObject(text.id, false);
            }}
            onDragEnd={(e) => {
              const node = e.target;
              updateText(text.id, {
                x: Math.max(0, Math.min(100, (node.x() / width) * 100)),
                y: Math.max(0, Math.min(100, (node.y() / height) * 100)),
              });
            }}
          >
            <KonvaText
              text={text.content}
              fontSize={text.fontSize ?? 18}
              fill={isSelected ? '#60a5fa' : (text.color ?? '#ffffff')}
              fontStyle={text.bold ? 'bold' : 'normal'}
              fontFamily="sans-serif"
              shadowColor="#000000"
              shadowBlur={4}
              shadowOpacity={0.8}
            />
          </Group>
        );
      })}
    </>
  );
}

export function AnnotationLayer({
  width,
  height,
}: AnnotationLayerProps): ReactNode {
  return (
    <Layer>
      <ZonesGroup width={width} height={height} />
      <ArrowsGroup width={width} height={height} />
      <TextsGroup width={width} height={height} />
    </Layer>
  );
}
