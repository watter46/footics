'use client';

/**
 * drawing-toolbar.tsx
 * Floating & draggable drawing toolbar
 */

import { Eraser, GripVertical, Lock, RotateCcw, Unlock } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { PRIMARY_TOOLS } from './drawing-tool-config';
import { useToolbarDrag } from './use-toolbar-drag';

export function DrawingToolbar() {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const continuousDrawing = useTacticalUnifiedStore((s) => s.continuousDrawing);
  const toggleContinuousDrawing = useTacticalUnifiedStore(
    (s) => s.toggleContinuousDrawing,
  );
  const resetSlideObjects = useTacticalUnifiedStore((s) => s.resetSlideObjects);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const togglePitchLock = useTacticalUnifiedStore((s) => s.togglePitchLock);
  const isPitchLocked = useTacticalUnifiedStore(
    (s) =>
      s.project.slides.find((sl) => sl.id === s.activeSlideId)?.pitchTransform
        ?.isLocked ?? false,
  );

  const { position, handlePointerDown } = useToolbarDrag();

  return (
    <div
      onPointerDown={handlePointerDown}
      style={{
        transform: `translate(${position.x}px, calc(-50% + ${position.y}px))`,
      }}
      className="absolute right-3 top-1/2 z-40 max-h-[calc(100%-1.5rem)] overflow-y-auto no-scrollbar flex flex-col items-center gap-1 p-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl select-none cursor-grab active:cursor-grabbing touch-none"
    >
      <div
        className="text-white/40 hover:text-white/80 p-0.5 cursor-grab active:cursor-grabbing shrink-0"
        title="Drag to reposition toolbar"
      >
        <GripVertical size={14} className="rotate-90" />
      </div>

      {/* ── Primary Drawing Tools (Single Column) ── */}
      {PRIMARY_TOOLS.map(({ tool, icon: Icon, label }) => (
        <button
          type="button"
          key={tool}
          onClick={() => setActiveTool(tool)}
          title={label}
          aria-label={label}
          className={[
            'p-1.5 rounded-lg transition-all cursor-pointer shrink-0',
            activeTool === tool
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
              : 'text-white/60 hover:text-white hover:bg-white/10',
          ].join(' ')}
        >
          <Icon size={16} />
        </button>
      ))}

      {/* ── Divider: Continuous Lock & Eraser ── */}
      <div className="h-px w-4 bg-white/20 my-0.5 shrink-0" />

      {/* Continuous Drawing Lock */}
      <button
        type="button"
        onClick={toggleContinuousDrawing}
        title={
          continuousDrawing
            ? 'Continuous Draw: ON (Stays in drawing mode after creation)'
            : 'Continuous Draw: OFF (Click to toggle)'
        }
        aria-label="Continuous Draw Lock"
        className={[
          'p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0',
          continuousDrawing
            ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/30 ring-1 ring-amber-300'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ].join(' ')}
      >
        {continuousDrawing ? <Lock size={16} /> : <Unlock size={16} />}
      </button>

      {/* Eraser Mode */}
      <button
        type="button"
        onClick={() => setActiveTool('eraser')}
        title="Eraser Mode (Drag to erase objects) (E)"
        aria-label="Eraser Mode"
        className={[
          'p-1.5 rounded-lg transition-all cursor-pointer shrink-0',
          activeTool === 'eraser'
            ? 'bg-red-600 text-white shadow-md shadow-red-500/30 ring-1 ring-red-400'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ].join(' ')}
      >
        <Eraser size={16} />
      </button>

      {/* ── Divider: Reset ── */}
      <div className="h-px w-4 bg-white/20 my-0.5 shrink-0" />

      {/* Reset all objects */}
      <button
        type="button"
        onClick={() => {
          if (
            window.confirm(
              'Are you sure you want to reset and delete all drawing objects on this slide?',
            )
          ) {
            resetSlideObjects();
          }
        }}
        title="Reset all slide objects"
        aria-label="Reset all slide objects"
        className="p-1.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer shrink-0"
      >
        <RotateCcw size={16} />
      </button>

      {/* ── Divider: Pitch Lock ── */}
      <div className="h-px w-4 bg-white/20 my-0.5 shrink-0" />

      {/* Pitch Lock toggle */}
      <button
        type="button"
        onClick={() => togglePitchLock(activeSlideId)}
        title={
          isPitchLocked
            ? 'ピッチ固定解除 (Pitch Locked - 移動可能に切り替え)'
            : 'ピッチを固定 (Lock Pitch - 誤操作防止)'
        }
        aria-label="Pitch Lock"
        className={[
          'p-1.5 rounded-lg transition-all cursor-pointer shrink-0',
          isPitchLocked
            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 ring-1 ring-blue-300'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ].join(' ')}
      >
        {isPitchLocked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>
    </div>
  );
}
