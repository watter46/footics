'use client';

import { ChevronDown, Crop, Expand, Maximize2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
  type XMediaRatio,
} from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { BoundaryBoxTiltControls } from './BoundaryBoxTiltControls';

export interface BoundaryBoxHudProps {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  showTiltControls?: boolean;
}

const PRESET_RATIOS: { ratio: XMediaRatio; label: string }[] = [
  { ratio: '16:9', label: '16:9' },
  { ratio: '9:16', label: '9:16' },
  { ratio: '4:5', label: '4:5' },
  { ratio: '1:1', label: '1:1' },
];

function calculateRatioInfo(
  box: { width: number; height: number; enabled?: boolean } | undefined,
  canvasAspect: AspectRatio,
) {
  if (!box?.enabled || box.height === 0) {
    return { ratioLabel: '', matchedRatio: null };
  }
  const stageAspect = ASPECT_RATIOS[canvasAspect] ?? 16 / 9;
  const currentAspect = (box.width / box.height) * stageAspect;

  for (const p of PRESET_RATIOS) {
    const target = ASPECT_RATIOS[p.ratio as AspectRatio] ?? 1;
    if (Math.abs(currentAspect - target) < 0.05) {
      return { ratioLabel: p.label, matchedRatio: p.ratio };
    }
  }
  return {
    ratioLabel: `${currentAspect.toFixed(2)}:1`,
    matchedRatio: null,
  };
}

export function BoundaryBoxHud({
  stageSize,
  pitchRect,
  showTiltControls = true,
}: BoundaryBoxHudProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const boundaryBox = useCanvasStore((s) => s.boundaryBox);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const aspectRatio = useCanvasStore((s) => s.aspectRatio);
  const pitchTransform = useCanvasStore((s) => s.pitchTransform);
  const setPitchTransform = useCanvasStore((s) => s.setPitchTransform);

  const currentTilt = pitchTransform?.tilt ?? 0;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const { ratioLabel, matchedRatio } = useMemo(
    () => calculateRatioInfo(boundaryBox, aspectRatio),
    [boundaryBox, aspectRatio],
  );

  if (
    !boundaryBox?.enabled ||
    boundaryBox?.visible === false ||
    stageSize.width === 0
  ) {
    return null;
  }

  return (
    <aside
      ref={containerRef}
      aria-label="Boundary Box Ratio HUD"
      className="absolute top-4 left-4 z-40 pointer-events-auto flex flex-col items-start gap-1 select-none text-xs text-white"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Toggle Boundary Box Settings"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
          isOpen
            ? 'bg-neutral-800 border-sky-500/50 ring-1 ring-sky-400/40 text-white'
            : 'bg-neutral-900/90 hover:bg-neutral-800/90 border-white/20 hover:border-white/40 text-white/90'
        }`}
      >
        <div className="flex items-center gap-1 text-sky-400 font-medium shrink-0">
          <Crop size={13} />
          <span className="font-mono text-[11px] font-semibold text-white/90">
            {ratioLabel}
          </span>
        </div>

        {showTiltControls && currentTilt > 0 && (
          <>
            <span className="text-white/30 text-[10px]">|</span>
            <span className="font-mono text-[11px] text-sky-300 font-medium">
              {currentTilt}°
            </span>
          </>
        )}

        <ChevronDown
          size={12}
          className={`text-white/50 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-white/20 shadow-2xl animate-in fade-in zoom-in-95 duration-100 min-w-[240px]">
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Aspect Ratio
            </div>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                {PRESET_RATIOS.map(({ ratio, label }) => {
                  const isActive = matchedRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => {
                        const newBox = createXBoundaryBox(ratio, aspectRatio);
                        setBoundaryBox({ ...newBox, visible: true });
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-sky-500/30 text-sky-300 font-semibold ring-1 ring-sky-400/50'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                      title={`Snap boundary box to ${label}`}
                      aria-label={`Snap boundary to ${label}`}
                      aria-pressed={isActive}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-4 bg-white/20" />

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setBoundaryBox({
                      x: 0,
                      y: 0,
                      width: 100,
                      height: 100,
                      enabled: true,
                      visible: true,
                      fitTarget: 'pitch',
                    });
                  }}
                  className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="AutoFitPitch (ピッチ外枠にフィット)"
                  aria-label="AutoFitPitch"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBoundaryBox({
                      ...DEFAULT_BOUNDARY_BOX_FULL,
                      visible: true,
                    })
                  }
                  className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="AutoFitCanvas (全画面フィット 100% × 100%)"
                  aria-label="AutoFitCanvas"
                >
                  <Expand size={13} />
                </button>
              </div>
            </div>
          </div>

          {showTiltControls && (
            <>
              <div className="w-full h-px bg-white/15" />
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Pitch 2.5D Tilt
                </div>
                <BoundaryBoxTiltControls
                  currentTilt={currentTilt}
                  onTiltChange={(tilt) => setPitchTransform({ tilt })}
                />
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
