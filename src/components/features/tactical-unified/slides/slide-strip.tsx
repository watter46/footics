'use client';

/**
 * slide-strip.tsx
 * Bottom slide strip — プレビュー ｜ スライド一覧 ｜ ＋追加
 * 高さ: 64px (minimal)
 */

import { Play, Plus, Trash2 } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function SlideStrip() {
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const addSlide = useTacticalUnifiedStore((s) => s.addSlide);
  const deleteSlide = useTacticalUnifiedStore((s) => s.deleteSlide);

  return (
    <footer className="flex items-center gap-2 h-16 px-3 bg-[#111] border-t border-white/10 overflow-x-auto shrink-0">
      {/* Preview button */}
      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0"
        aria-label="プレビュー再生"
      >
        <Play size={12} fill="currentColor" />
        <span>プレビュー</span>
      </button>

      <div className="w-px h-8 bg-white/10 shrink-0" />

      {/* Slide thumbnails */}
      <div className="flex items-center gap-2 flex-1 overflow-x-auto">
        {slides.map((slide, i) => (
          <div key={slide.id} className="relative group shrink-0">
            <button
              type="button"
              onClick={() => setActiveSlide(slide.id)}
              className={[
                'flex flex-col items-center justify-center w-12 h-10 rounded-lg border text-xs transition-all',
                activeSlideId === slide.id
                  ? 'border-blue-500 bg-blue-600/20 text-white'
                  : 'border-white/20 bg-white/5 text-white/50 hover:border-white/40 hover:text-white',
              ].join(' ')}
              aria-label={`スライド ${i + 1}`}
            >
              <span className="text-[10px] font-mono">{i + 1}</span>
            </button>
            {/* Delete button (hover) */}
            {slides.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlide(slide.id);
                }}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white"
                aria-label="スライド削除"
              >
                <Trash2 size={9} />
              </button>
            )}
          </div>
        ))}

        {/* Add slide */}
        <button
          type="button"
          onClick={() => addSlide()}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-dashed border-white/30 text-white/40 hover:border-white/60 hover:text-white/80 transition-colors shrink-0"
          aria-label="スライド追加"
        >
          <Plus size={14} />
        </button>
      </div>
    </footer>
  );
}
