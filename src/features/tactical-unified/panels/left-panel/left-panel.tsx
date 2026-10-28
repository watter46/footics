'use client';

import { Layers, Plus } from 'lucide-react';
import type { Slide } from '@/lib/types/tactical-unified';
import { cn } from '@/lib/utils';

export interface LeftPanelProps {
  slides: Slide[];
  activeSlideId: string;
  onSelectSlide: (slideId: string) => void;
  onAddSlide: () => void;
}

export function LeftPanel({
  slides,
  activeSlideId,
  onSelectSlide,
  onAddSlide,
}: LeftPanelProps) {
  return (
    <aside
      aria-label="Tactical Sequences"
      className="w-64 bg-[#121214] border-r border-white/[0.07] flex flex-col text-xs shrink-0 select-none z-10"
    >
      <div className="p-3 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-3.5 text-[#FF8100]" strokeWidth={1.5} />
          <span className="text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
            Tactical Sequences
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#71717A]">
          {slides.length} {slides.length === 1 ? 'scene' : 'scenes'}
        </span>
      </div>

      <div className="p-2 space-y-1.5 overflow-y-auto flex-1 custom-scrollbar">
        {slides.map((slide, idx) => {
          const isActive = activeSlideId === slide.id;
          return (
            <div
              key={slide.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSlide(slide.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSlide(slide.id);
                }
              }}
              className={cn(
                'p-2.5 rounded-[8px] border transition-all cursor-pointer relative text-left',
                isActive
                  ? 'bg-[#18181B] border-white/[0.07] shadow-sm'
                  : 'hover:bg-[#18181B] text-[#A1A1AA] hover:text-[#F4F4F5] border-transparent hover:border-white/[0.05]',
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#FF8100] rounded-r-full shadow-[0_0_8px_#FF8100]" />
              )}
              <div className="flex items-center justify-between pl-1.5">
                <span className="font-semibold text-white">
                  {slide.label ? slide.label : `Scene ${idx + 1}`}
                </span>
                <span className="text-[10px] font-mono text-[#60A5FA]">
                  {((slide.pauseMs ?? 500) / 1000).toFixed(1)}s
                </span>
              </div>
              <p className="text-[10px] text-[#A1A1AA] pl-1.5 mt-0.5 truncate">
                {slide.label || `Tactical Phase ${idx + 1}`}
              </p>
            </div>
          );
        })}

        {/* Empty State / Custom Annotation Tags (推奨仕様5) */}
        <div className="pt-3 pb-1 px-1">
          <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">
            Annotations
          </span>
        </div>
        <div className="border border-dashed border-white/10 rounded-[8px] p-3 text-center space-y-2 bg-[#0D0D0E]/50">
          <Layers className="size-4 mx-auto text-[#71717A]" strokeWidth={1.5} />
          <p className="text-[10px] text-[#71717A]">
            カスタム注釈タグは未登録です
          </p>
          <button
            type="button"
            onClick={onAddSlide}
            className="px-2.5 py-1 rounded-[6px] text-[10px] font-semibold bg-[#FF8100]/10 hover:bg-[#FF8100]/20 text-[#FF8100] border border-[#FF8100]/30 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Plus className="size-3" strokeWidth={1.5} />
            <span>シーン追加</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
