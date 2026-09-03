'use client';

/**
 * x-media-preset-menu.tsx
 * Popover menu for selecting X (Twitter) optimized aspect ratios:
 *  - 📸 1 Image: 4:5 (1080×1350px / TL max height & dwell time)
 *  - 🖼️ 2 Carousel Images: 9:16 (1080×1920px / Full screen takeover)
 *  - 🎬 1 Video: 9:16 (1080×1920px / Vertical feed recommendation)
 *  - 🏟️ Full Pitch Overview: 16:9 (1200×675px / 22 players safe zone)
 *  - 🎯 Pitch Fit: Reset boundary to pitch lines
 */

import {
  Check,
  Columns2,
  Crop,
  Film,
  Image as ImageIcon,
  Maximize2,
  Monitor,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type BoundaryBox,
  X_MEDIA_PRESETS,
  type XMediaPresetKey,
} from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

interface PresetItem {
  id: XMediaPresetKey | 'pitch_fit';
  name: string;
  badge: string;
  desc: string;
  icon: React.ElementType;
  iconColor: string;
}

const PRESET_ITEMS: PresetItem[] = [
  {
    id: 'single_image_4_5',
    name: '画像1枚 (4:5)',
    badge: '1080×1350',
    desc: 'TL最大高さ・Dwell Time最大化',
    icon: ImageIcon,
    iconColor: 'text-sky-400',
  },
  {
    id: 'carousel_image_9_16',
    name: '画像2枚カルーセル (9:16)',
    badge: '1080×1920',
    desc: '横スワイプ・スマホ全画面ジャック',
    icon: Columns2,
    iconColor: 'text-purple-400',
  },
  {
    id: 'feed_video_9_16',
    name: '動画1本 (9:16)',
    badge: '1080×1920',
    desc: 'おすすめ全画面縦フィード',
    icon: Film,
    iconColor: 'text-emerald-400',
  },
  {
    id: 'pitch_overview_16_9',
    name: 'ピッチ全体横画像 (16:9)',
    badge: '1200×675',
    desc: '22人配置・ピッチ俯瞰の安全圏',
    icon: Monitor,
    iconColor: 'text-amber-400',
  },
];

function detectActivePreset(
  boundaryBox: BoundaryBox | undefined,
  canvasAspect: AspectRatio,
): XMediaPresetKey | 'pitch_fit' | null {
  if (!boundaryBox?.enabled) return null;
  const stageAspect = ASPECT_RATIOS[canvasAspect] ?? 16 / 9;
  const currentAspect = (boundaryBox.width / boundaryBox.height) * stageAspect;

  for (const item of PRESET_ITEMS) {
    if (item.id === 'pitch_fit') continue;
    const targetAspect = X_MEDIA_PRESETS[item.id].numericRatio;
    if (Math.abs(currentAspect - targetAspect) < 0.05) {
      return item.id;
    }
  }
  return null;
}

export function XMediaPresetMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyXMediaPreset = useTacticalUnifiedStore((s) => s.applyXMediaPreset);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const project = useTacticalUnifiedStore((s) => s.project);

  const activeSlide = project.slides.find((sl) => sl.id === activeSlideId);
  const activePresetKey = detectActivePreset(
    activeSlide?.boundaryBox,
    project.aspectRatio,
  );

  const handleSelectPreset = useCallback(
    (presetKey: XMediaPresetKey | 'pitch_fit') => {
      applyXMediaPreset(presetKey);
      setIsOpen(false);
    },
    [applyXMediaPreset],
  );

  // Close when clicking outside or pressing Escape
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Xメディア最適化比率 (4:5 / 9:16 / 16:9)"
        aria-label="Xメディア最適化比率メニュー"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={[
          'p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1',
          isOpen
            ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30 ring-1 ring-sky-400'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ].join(' ')}
      >
        <Crop size={15} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Xメディア最適化比率メニュー"
          tabIndex={-1}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-full right-0 mb-2.5 w-76 p-2 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-white/20 shadow-2xl z-50 flex flex-col gap-1 text-white select-none animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Menu Header */}
          <div className="px-2 py-1.5 border-b border-white/10 flex items-center justify-between">
            <span className="font-semibold text-xs tracking-wide text-white/90">
              X メディア最適化比率
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium">
              チートシート準拠
            </span>
          </div>

          {/* Preset Options */}
          <div className="flex flex-col gap-0.5 mt-0.5">
            {PRESET_ITEMS.map(
              ({ id, name, badge, desc, icon: Icon, iconColor }) => {
                const isActive = activePresetKey === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectPreset(id)}
                    className={[
                      'w-full flex items-start gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white',
                    ].join(' ')}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon size={16} className={iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white truncate">
                          {name}
                        </span>
                        <span className="text-[10px] text-white/50 font-mono">
                          {badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate leading-tight mt-0.5">
                        {desc}
                      </p>
                    </div>
                    {isActive && (
                      <Check size={14} className="text-sky-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              },
            )}

            {/* Divider */}
            <div className="border-t border-white/10 my-1" />

            {/* Pitch White Line Fit */}
            <button
              type="button"
              onClick={() => handleSelectPreset('pitch_fit')}
              className="w-full flex items-start gap-2.5 px-2 py-1.5 rounded-lg text-left text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <div className="mt-0.5 shrink-0">
                <Maximize2 size={16} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white truncate">
                    ピッチ白線フィット
                  </span>
                  <span className="text-[10px] text-white/50">リセット</span>
                </div>
                <p className="text-[11px] text-white/50 truncate leading-tight mt-0.5">
                  白線境界・ピッチ全体にリセット
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
