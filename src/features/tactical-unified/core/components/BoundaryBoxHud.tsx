'use client';

import { ChevronDown, Crop, Expand, Maximize2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import {
  ASPECT_RATIOS,
  type AspectRatio,
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
  pitchRect: _pitchRect,
  showTiltControls = true,
}: BoundaryBoxHudProps) {
  const [isOpen, setIsOpen] = useState(false);

  const boundaryBox = useCanvasStore((s) => s.boundaryBox);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const aspectRatio = useCanvasStore((s) => s.aspectRatio);
  const pitchTransform = useCanvasStore((s) => s.pitchTransform);
  const setPitchTransform = useCanvasStore((s) => s.setPitchTransform);

  const currentTilt = pitchTransform?.tilt ?? 0;

  const { ratioLabel } = useMemo(
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
      aria-label="Boundary Box Ratio HUD"
      className="absolute top-4 left-4 z-40 pointer-events-auto flex flex-col items-start gap-1 select-none text-xs text-white"
    >
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Toggle Boundary Box Settings"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
                isOpen
                  ? 'bg-surface-l3 border-sky-500/50 ring-1 ring-sky-400/40 text-white'
                  : 'bg-surface-l2/90 hover:bg-surface-l3/90 border-white/[0.08] hover:border-white/20 text-white/90'
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
          }
        />

        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={4}
          className="flex flex-col gap-2 p-2.5 rounded-xl bg-surface-l3 backdrop-blur-md border border-white/[0.08] shadow-2xl min-w-[200px]"
        >
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              境界線プリセット
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setBoundaryBox({
                    ...DEFAULT_BOUNDARY_BOX_FULL,
                    visible: true,
                  })
                }
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/[0.08] transition-colors cursor-pointer"
                title="AutoFitCanvas (全画面フィット 100% × 100%)"
                aria-label="全画面"
              >
                <Expand size={13} className="text-sky-400" />
                <span>全画面</span>
              </button>

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
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/[0.08] transition-colors cursor-pointer"
                title="AutoFitPitch (ピッチ外枠にフィット)"
                aria-label="ピッチフィット"
              >
                <Maximize2 size={13} className="text-emerald-400" />
                <span>ピッチフィット</span>
              </button>
            </div>
          </div>

          {showTiltControls && (
            <>
              <div className="w-full h-px bg-white/[0.08]" />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}
