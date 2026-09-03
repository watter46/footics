'use client';

/**
 * zone-object.tsx
 * 四角形・円形・多角形フリーゾーンの描画・頂点ハンドル・カスタム回転
 */

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useEffect, useRef } from 'react';
import { Circle, Ellipse, Group, Line, Rect, Transformer } from 'react-konva';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from '../canvas-registry';
import { normX, normY, pxToNormX, pxToNormY } from './math-utils';

type KonvaClickEvent =
  | KonvaEventObject<MouseEvent>
  | KonvaEventObject<TouchEvent>;

export interface ZoneObjectProps {
  zone: ZoneAnnotation;
  slideId: string;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  updateZone: (
    slideId: string,
    zoneId: string,
    patch: Partial<ZoneAnnotation>,
  ) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  isCreatingThis?: boolean;
  mousePreviewPos?: { x: number; y: number } | null;
}

export const ZoneObject = React.memo(function ZoneObject({
  zone,
  slideId,
  stageSize,
  isSelected,
  onSelect,
  updateZone,
  nodesRegistryRef,
  isCreatingThis,
  mousePreviewPos,
}: ZoneObjectProps) {
  const { width, height } = stageSize;
  const shapeType = zone.shapeType || 'rect';

  const opacity = zone.opacity ?? 0.25;
  const alphaHex = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0');
  const fillRGBA = (zone.color || '#22c55e') + alphaHex;
  const strokeColor = zone.strokeColor ?? zone.color ?? '#22c55e';
  const strokeWidth = zone.strokeWidth || 2;

  const shapeNodeRef = useRef<Konva.Node | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);

  useEffect(() => {
    if (!transformerRef.current) return;
    if (isSelected && shapeNodeRef.current && shapeType !== 'polygon') {
      transformerRef.current.nodes([shapeNodeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, shapeType]);

  // 1. 多角形（Polygon Zone）
  if (shapeType === 'polygon') {
    const pts = zone.points;
    const isComplete = zone.isComplete !== false;

    let renderPts = pts.flatMap((p) => [normX(p.x, width), normY(p.y, height)]);
    if (isCreatingThis && mousePreviewPos) {
      renderPts = [...renderPts, mousePreviewPos.x, mousePreviewPos.y];
    }

    const vertexPairs = pts.map((p) => ({
      normX: p.x,
      normY: p.y,
      pxX: normX(p.x, width),
      pxY: normY(p.y, height),
    }));

    return (
      <Group
        draggable={isSelected}
        onDragStart={(e) => {
          if (e.target.name() === 'control-handle') {
            e.cancelBubble = true;
          }
        }}
        onDragEnd={(e) => {
          if (e.target.name() === 'control-handle') return;
          e.cancelBubble = true;
          const dxPx = e.target.x();
          const dyPx = e.target.y();
          e.target.position({ x: 0, y: 0 });

          const dxNorm = (dxPx / width) * 100;
          const dyNorm = (dyPx / height) * 100;

          const newPts = pts.map((p) => ({
            x: p.x + dxNorm,
            y: p.y + dyNorm,
          }));

          updateZone(slideId, zone.id, { points: newPts });
        }}
      >
        <Line
          ref={(node) => {
            if (nodesRegistryRef) {
              if (node) nodesRegistryRef.current.zoneNodes.set(zone.id, node);
              else nodesRegistryRef.current.zoneNodes.delete(zone.id);
            }
          }}
          points={renderPts}
          closed={isComplete}
          fill={isComplete ? fillRGBA : undefined}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={20}
          onClick={onSelect}
          onTap={onSelect}
        />

        {/* 描画中の頂点ドット */}
        {!isComplete &&
          vertexPairs.map((v, idx) => (
            <Circle
              key={`v-draw-${zone.id}-${idx}`}
              x={v.pxX}
              y={v.pxY}
              radius={idx === 0 ? 7 : 4}
              fill={idx === 0 ? '#38bdf8' : '#ffffff'}
              stroke={zone.color}
              strokeWidth={2}
              listening={false}
            />
          ))}

        {/* 選択中の頂点ドラッグ変形ハンドル */}
        {isComplete &&
          isSelected &&
          vertexPairs.map((v, idx) => (
            <Circle
              key={`v-handle-${zone.id}-${idx}`}
              name="control-handle"
              x={v.pxX}
              y={v.pxY}
              radius={7}
              hitStrokeWidth={20}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={2.5}
              draggable
              onMouseEnter={(e) => {
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'grab';
              }}
              onMouseLeave={(e) => {
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'default';
              }}
              onDragStart={(e) => {
                e.cancelBubble = true;
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'grabbing';
              }}
              onDragMove={(e) => {
                e.cancelBubble = true;
                const newPxX = e.target.x();
                const newPxY = e.target.y();
                const lineNode = e.target.getParent()?.findOne('Line') as
                  | Konva.Line
                  | undefined;
                if (lineNode) {
                  const currentLinePts = [...lineNode.points()];
                  currentLinePts[idx * 2] = newPxX;
                  currentLinePts[idx * 2 + 1] = newPxY;
                  lineNode.points(currentLinePts);
                  lineNode.getLayer()?.batchDraw();
                }
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
                const newPxX = e.target.x();
                const newPxY = e.target.y();
                const c = e.target.getStage()?.container();
                if (c) c.style.cursor = 'grab';

                const newNormX = pxToNormX(newPxX, width);
                const newNormY = pxToNormY(newPxY, height);

                const updatedPoints = [...pts];
                updatedPoints[idx] = { x: newNormX, y: newNormY };

                updateZone(slideId, zone.id, { points: updatedPoints });
              }}
            />
          ))}
      </Group>
    );
  }

  // 2. 四角形（Rect） & 楕円（Ellipse）
  // 座標・サイズ（正規化からピクセルへ変換）
  const normPosX = zone.x ?? zone.points[0]?.x ?? 20;
  const normPosY = zone.y ?? zone.points[0]?.y ?? 20;
  let normW =
    zone.width ??
    (zone.points.length >= 2
      ? Math.abs(zone.points[1].x - zone.points[0].x)
      : 30);
  let normH =
    zone.height ??
    (zone.points.length >= 4
      ? Math.abs(zone.points[2].y - zone.points[0].y)
      : 20);

  if (normW <= 0) normW = 20;
  if (normH <= 0) normH = 15;

  const pxW = normX(normW, width);
  const pxH = normY(normH, height);
  const cx = normX(normPosX, width) + pxW / 2;
  const cy = normY(normPosY, height) + pxH / 2;
  const rotation = zone.rotation || 0;

  return (
    <Group>
      {shapeType === 'ellipse' ? (
        <Ellipse
          ref={(node) => {
            shapeNodeRef.current = node;
            if (nodesRegistryRef) {
              if (node) nodesRegistryRef.current.zoneNodes.set(zone.id, node);
              else nodesRegistryRef.current.zoneNodes.delete(zone.id);
            }
          }}
          x={cx}
          y={cy}
          radiusX={pxW / 2}
          radiusY={pxH / 2}
          rotation={rotation}
          fill={fillRGBA}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          draggable={isSelected}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            const node = e.target;
            const newNormX = pxToNormX(node.x() - pxW / 2, width);
            const newNormY = pxToNormY(node.y() - pxH / 2, height);
            updateZone(slideId, zone.id, {
              x: newNormX,
              y: newNormY,
              rotation: node.rotation(),
            });
          }}
        />
      ) : (
        <Rect
          ref={(node) => {
            shapeNodeRef.current = node;
            if (nodesRegistryRef) {
              if (node) nodesRegistryRef.current.zoneNodes.set(zone.id, node);
              else nodesRegistryRef.current.zoneNodes.delete(zone.id);
            }
          }}
          x={cx}
          y={cy}
          width={pxW}
          height={pxH}
          offsetX={pxW / 2}
          offsetY={pxH / 2}
          rotation={rotation}
          fill={fillRGBA}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          draggable={isSelected}
          onClick={onSelect}
          onTap={onSelect}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            const node = e.target;
            const newNormX = pxToNormX(node.x() - pxW / 2, width);
            const newNormY = pxToNormY(node.y() - pxH / 2, height);
            updateZone(slideId, zone.id, {
              x: newNormX,
              y: newNormY,
              rotation: node.rotation(),
            });
          }}
        />
      )}

      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10)
              return oldBox;
            return newBox;
          }}
          keepRatio={false}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          rotateEnabled={false}
          borderStroke="#3b82f6"
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorSize={9}
          anchorCornerRadius={2}
          onTransformEnd={() => {
            const node = shapeNodeRef.current;
            if (!node) return;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const rot = node.rotation();
            node.scaleX(1);
            node.scaleY(1);

            const newPxW = Math.abs(pxW * scaleX);
            const newPxH = Math.abs(pxH * scaleY);
            const newPxX = node.x() - newPxW / 2;
            const newPxY = node.y() - newPxH / 2;

            const newNormX = pxToNormX(newPxX, width);
            const newNormY = pxToNormY(newPxY, height);
            const newNormW = (newPxW / width) * 100;
            const newNormH = (newPxH / height) * 100;

            updateZone(slideId, zone.id, {
              x: newNormX,
              y: newNormY,
              width: newNormW,
              height: newNormH,
              rotation: rot,
              points: [
                { x: newNormX, y: newNormY },
                { x: newNormX + newNormW, y: newNormY },
                { x: newNormX + newNormW, y: newNormY + newNormH },
                { x: newNormX, y: newNormY + newNormH },
              ],
            });
          }}
        />
      )}
    </Group>
  );
});
