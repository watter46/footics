'use client';

import { Crop, Lock, Pin, Redo2, Trash2, Undo2, Unlock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { PALETTE, TOOL_DEFINITIONS } from './toolbar-tools';

export interface CoreDrawingToolbarProps {
  className?: string;
}

export function CoreDrawingToolbar({
  className = '',
}: CoreDrawingToolbarProps): ReactNode {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const continuousDrawing = useCanvasStore((s) => s.continuousDrawing);
  const toggleContinuousDrawing = useCanvasStore(
    (s) => s.toggleContinuousDrawing,
  );
  const isPitchLocked = useCanvasStore((s) => s.pitchTransform.isLocked);
  const setPitchLocked = useCanvasStore((s) => s.setPitchLocked);
  const color = useCanvasStore((s) => s.color);
  const setColor = useCanvasStore((s) => s.setColor);
  const markerMode = useCanvasStore((s) => s.markerMode);
  const boundaryBox = useCanvasStore((s) => s.boundaryBox);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const removeSelected = useCanvasStore((s) => s.removeSelected);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.canUndo());
  const canRedo = useCanvasStore((s) => s.canRedo());

  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 shadow-2xl select-none ${className}`}
    >
      {TOOL_DEFINITIONS.map(({ tool, title, icon: Icon, markerCondition }) => {
        if (markerCondition === 'not-2d-only' && markerMode === '2d-only') {
          return null;
        }
        if (markerCondition === 'not-3d-only' && markerMode === '3d-only') {
          return null;
        }
        const isActive = activeTool === tool;
        return (
          <button
            key={tool}
            type="button"
            title={title}
            aria-label={title}
            onClick={() => setActiveTool(tool)}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}

      <div className="w-px h-6 bg-zinc-700 mx-0.5 shrink-0" />

      {/* 連続描画ロック */}
      <button
        type="button"
        title={
          continuousDrawing
            ? 'Continuous Drawing: ON'
            : 'Continuous Drawing: OFF'
        }
        aria-label="Continuous Drawing"
        onClick={toggleContinuousDrawing}
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          continuousDrawing
            ? 'bg-amber-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
      >
        <Pin size={18} />
      </button>

      {/* ピッチロック */}
      <button
        type="button"
        title={isPitchLocked ? 'Pitch Lock (Locked)' : 'Pitch Lock (Unlocked)'}
        aria-label="Pitch Lock"
        onClick={() => setPitchLocked(!isPitchLocked)}
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          isPitchLocked
            ? 'bg-amber-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
      >
        {isPitchLocked ? <Lock size={18} /> : <Unlock size={18} />}
      </button>

      {/* Boundary Box 切替 */}
      <button
        type="button"
        title="Toggle Boundary Box"
        aria-label="Toggle Boundary Box"
        onClick={() =>
          setBoundaryBox({ ...boundaryBox, visible: !boundaryBox.visible })
        }
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          boundaryBox.visible
            ? 'bg-sky-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
      >
        <Crop size={18} />
      </button>

      <div className="w-px h-6 bg-zinc-700 mx-0.5 shrink-0" />

      {/* カラーパレット */}
      <div className="flex items-center gap-1">
        {PALETTE.map((p) => (
          <button
            key={p.value}
            type="button"
            title={p.label}
            aria-label={p.label}
            onClick={() => setColor(p.value)}
            style={{ backgroundColor: p.value }}
            className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
              color === p.value
                ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                : 'hover:scale-110 opacity-80 hover:opacity-100'
            }`}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-zinc-700 mx-0.5 shrink-0" />

      {/* 削除 */}
      <button
        type="button"
        title="Delete Selected"
        aria-label="Delete Selected tool"
        onClick={removeSelected}
        className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-all cursor-pointer"
      >
        <Trash2 size={18} />
      </button>

      {/* Undo */}
      <button
        type="button"
        title="Undo (Ctrl+Z)"
        aria-label="Undo tool"
        disabled={!canUndo}
        onClick={undo}
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          canUndo
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'text-zinc-600 cursor-not-allowed opacity-40'
        }`}
      >
        <Undo2 size={18} />
      </button>

      {/* Redo */}
      <button
        type="button"
        title="Redo (Ctrl+Y)"
        aria-label="Redo tool"
        disabled={!canRedo}
        onClick={redo}
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          canRedo
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'text-zinc-600 cursor-not-allowed opacity-40'
        }`}
      >
        <Redo2 size={18} />
      </button>
    </div>
  );
}
