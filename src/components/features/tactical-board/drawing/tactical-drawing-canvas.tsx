'use client';

import type React from 'react';
import { useState } from 'react';
import {
  Arrow,
  Circle,
  Ellipse,
  Group,
  Layer,
  Rect,
  Stage,
  Transformer,
} from 'react-konva';
import { ArrowShape } from './arrow-shape';
import { useDrawingHistory } from './hooks/use-drawing-history';
import { useDrawingHotkeys } from './hooks/use-drawing-hotkeys';
import { useDrawingInteraction } from './hooks/use-drawing-interaction';
import { KonvaStylePanel, type ShapeProperties } from './konva-style-panel';
import type { TacticalDrawTool } from './types';
import { ZoneShape } from './zone-shape';

export type { TacticalDrawTool };

import { getQuadraticBezierPoints } from './utils';

export interface TacticalDrawingCanvasProps {
  matchId: string;
  activeTool: TacticalDrawTool;
  onClearRef?: (clearFn: () => void) => void;
  onSelectToolRequested?: (tool: TacticalDrawTool) => void;
}

export const TacticalDrawingCanvas: React.FC<TacticalDrawingCanvasProps> = ({
  matchId: _matchId,
  activeTool,
  onClearRef,
  onSelectToolRequested,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    shapes,
    setShapes,
    history,
    historyStep,
    saveHistory,
    undo,
    redo,
    clearHistory,
  } = useDrawingHistory();

  const {
    containerRef,
    transformerRef,
    selectedNodeRef,
    dimensions,
    newShape,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleShapeClick,
    handleTransformEnd,
    handleShapeChange,
  } = useDrawingInteraction({
    activeTool,
    shapes,
    setShapes,
    selectedId,
    setSelectedId,
    saveHistory,
    onSelectToolRequested,
    onClearRef: (clearFn) => {
      if (onClearRef) {
        onClearRef(() => {
          clearHistory();
          setSelectedId(null);
        });
      }
    },
  });

  useDrawingHotkeys({
    shapes,
    setShapes,
    selectedId,
    setSelectedId,
    selectedNodeRef,
    history,
    historyStep,
    undo,
    redo,
    activeTool,
    onSelectToolRequested,
  });

  const selectedShape = shapes.find((s) => s.id === selectedId);
  const selectedProperties: ShapeProperties | null = selectedShape
    ? {
        type: selectedShape.type,
        color: selectedShape.color,
        strokeWidth: selectedShape.strokeWidth,
        dash: selectedShape.dash,
        opacity: selectedShape.opacity,
        isCurved: selectedShape.isCurved,
        zoneShape: selectedShape.zoneShape,
        fillOpacity: selectedShape.fillOpacity,
      }
    : null;

  const allShapesToRender = newShape ? [...shapes, newShape] : shapes;

  return (
    <div
      ref={containerRef}
      className="tdc-canvas absolute inset-0 w-full h-full z-10 overflow-hidden"
      style={{ pointerEvents: 'auto' }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {allShapesToRender.map((shape) => {
              const isSelected = shape.id === selectedId;

              if (shape.type === 'arrow' && shape.points) {
                return (
                  <ArrowShape
                    key={shape.id}
                    shape={shape}
                    isSelected={isSelected}
                    activeTool={activeTool}
                    handleShapeClick={handleShapeClick}
                    setShapes={setShapes}
                    saveHistory={saveHistory}
                  />
                );
              }

              if (shape.type === 'zone') {
                return (
                  <ZoneShape
                    key={shape.id}
                    shape={shape}
                    isSelected={isSelected}
                    activeTool={activeTool}
                    handleShapeClick={handleShapeClick}
                    setShapes={setShapes}
                    saveHistory={saveHistory}
                  />
                );
              }

              return null;
            })}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
              enabledAnchors={[
                'top-left',
                'top-center',
                'top-right',
                'middle-right',
                'middle-left',
                'bottom-left',
                'bottom-center',
                'bottom-right',
              ]}
              rotateEnabled={false} // Default rotation handle off, use custom
              onTransformEnd={(e) => {
                const node = selectedNodeRef.current;
                if (!node || !selectedShape) return;
                handleTransformEnd(selectedShape, node);
              }}
              borderStroke="#3b82f6"
              anchorStroke="#3b82f6"
              anchorFill="#ffffff"
              anchorSize={8}
            />
          </Layer>
        </Stage>
      )}

      {/* Floating Style Panel (Zone/Arrow properties) */}
      <div
        className="absolute top-4 left-4 z-20"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <KonvaStylePanel
          properties={selectedProperties}
          onChange={handleShapeChange}
        />
      </div>
    </div>
  );
};
