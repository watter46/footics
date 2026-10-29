'use client';

import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type {
  PitchAppearanceConfig,
  TacticalPhase,
} from '@/lib/types/tactical-unified';
import { cn } from '@/lib/utils';
import { SceneCanvasThumbnail } from './scene-canvas-thumbnail';

export interface PhaseSectionProps {
  phase: TacticalPhase;
  isExpanded: boolean;
  isActivePhase: boolean;
  activeSlideId?: string;
  canDeletePhase: boolean;
  pitchAppearance?: PitchAppearanceConfig;
  onToggleExpand: (phaseId: string) => void;
  onSelectScene: (phaseId: string, slideId: string) => void;
  onAddSlideToPhase: (phaseId: string) => void;
  onDeletePhaseRequest: (phaseId: string) => void;
  onRenamePhase: (phaseId: string, name: string) => void;
}

export function PhaseSection({
  phase,
  isExpanded,
  isActivePhase,
  activeSlideId,
  canDeletePhase,
  pitchAppearance,
  onToggleExpand,
  onSelectScene,
  onAddSlideToPhase,
  onDeletePhaseRequest,
  onRenamePhase,
}: PhaseSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(phase.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditName(phase.name);
  }, [phase.name]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleFinishEditing = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== phase.name) {
      onRenamePhase(phase.id, trimmed);
    } else {
      setEditName(phase.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditName(phase.name);
      setIsEditing(false);
    }
  };

  const sceneCount = phase.slides.length;

  return (
    <div className="border-b border-white/[0.07] last:border-b-0">
      {/* Phase Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 select-none group transition-colors',
          isActivePhase ? 'bg-[#18181B]' : 'hover:bg-[#18181B]/60',
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onToggleExpand(phase.id)}
            aria-label={
              isExpanded ? `Collapse ${phase.name}` : `Expand ${phase.name}`
            }
            className="p-1 rounded hover:bg-white/10 text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" strokeWidth={1.5} />
            ) : (
              <ChevronRight className="size-3.5" strokeWidth={1.5} />
            )}
          </button>

          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleFinishEditing}
              onKeyDown={handleKeyDown}
              className="px-1.5 py-0.5 text-[11px] font-bold bg-[#0D0D0E] border border-[#FF8100] rounded text-[#F4F4F5] outline-none w-full max-w-[130px]"
            />
          ) : (
            <button
              type="button"
              onClick={() => onToggleExpand(phase.id)}
              onDoubleClick={() => setIsEditing(true)}
              className="text-[11px] font-bold text-[#F4F4F5] truncate text-left hover:text-[#FF8100] transition-colors"
            >
              {phase.name}
            </button>
          )}

          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label={`Rename ${phase.name}`}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-[#71717A] hover:text-[#F4F4F5] transition-opacity"
            >
              <Pencil className="size-2.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          <span className="text-[10px] font-mono text-[#71717A] px-1 py-0.5 rounded bg-white/[0.04]">
            {sceneCount} {sceneCount === 1 ? 'scene' : 'scenes'}
          </span>

          <button
            type="button"
            onClick={() => onAddSlideToPhase(phase.id)}
            aria-label={`Add scene to ${phase.name}`}
            className="p-1 rounded hover:bg-white/10 text-[#A1A1AA] hover:text-[#FF8100] transition-colors"
          >
            <Plus className="size-3" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={() => onDeletePhaseRequest(phase.id)}
            disabled={!canDeletePhase}
            aria-label={`Delete ${phase.name}`}
            className={cn(
              'p-1 rounded transition-colors',
              canDeletePhase
                ? 'hover:bg-white/10 text-[#71717A] hover:text-red-400'
                : 'text-white/20 cursor-not-allowed',
            )}
          >
            <Trash2 className="size-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Phase Slides List (Accordion Content) */}
      {isExpanded && (
        <div className="px-2 py-2 space-y-2 bg-[#0D0D0E]/60 border-t border-white/[0.04]">
          {phase.slides.map((slide, idx) => {
            const isSlideActive = isActivePhase && activeSlideId === slide.id;
            return (
              <div
                key={slide.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectScene(phase.id, slide.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectScene(phase.id, slide.id);
                  }
                }}
                className={cn(
                  'group p-2 rounded-[6px] border transition-all cursor-pointer relative flex gap-2 items-center',
                  isSlideActive
                    ? 'bg-[#18181B] border-[#FF8100]/60 shadow-[0_0_12px_rgba(255,129,0,0.15)] ring-1 ring-[#FF8100]/40'
                    : 'bg-[#121214] border-white/[0.06] hover:bg-[#18181B] hover:border-white/[0.12] text-[#A1A1AA]',
                )}
              >
                {/* Active Indicator Bar */}
                {isSlideActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FF8100] rounded-r-full shadow-[0_0_8px_#FF8100]" />
                )}

                {/* Canvas Thumbnail */}
                <div className="shrink-0 w-[96px] h-[54px] rounded overflow-hidden bg-black/40 border border-white/[0.08] relative flex items-center justify-center">
                  <SceneCanvasThumbnail
                    slide={slide}
                    width={96}
                    height={54}
                    pitchAppearance={pitchAppearance}
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute bottom-1 left-1 px-1 py-0.2 text-[9px] font-mono bg-black/75 rounded text-white/80 border border-white/10">
                    #{idx + 1}
                  </span>
                </div>

                {/* Scene Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-[11px] truncate">
                      {slide.label || `Scene ${idx + 1}`}
                    </span>
                    <span className="text-[10px] font-mono text-[#60A5FA] shrink-0 ml-1">
                      {((slide.pauseMs ?? 500) / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-[10px] text-[#71717A] mt-0.5 truncate font-mono">
                    Scene #{idx + 1}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
