'use client';

/**
 * add-slide-button.tsx
 * Bottom timeline slide addition button with Left/Right click branch & menu
 *
 * Left click: Object-free Copy (keeps player/ball coordinates, clears drawings)
 * Right click: Full Duplicate (copies all drawings, players, zones)
 */

import { ChevronDown, Copy, Plus, Sparkles, SquareDashed } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function AddSlideButton() {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const addSlide = useTacticalUnifiedStore((s) => s.addSlide);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // 左クリック: Object-free Copy
  const handleLeftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    addSlide(activeSlideId, 'object-free');
    setMenuOpen(false);
  };

  // 右クリック: Full Duplicate (コンテキストメニューを抑止)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addSlide(activeSlideId, 'full');
    setMenuOpen(false);
  };

  return (
    <div className="relative flex items-center shrink-0" ref={menuRef}>
      <div className="flex items-center rounded-lg border border-dashed border-white/20 bg-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all">
        {/* Main Add Button (L-Click: Object-free, R-Click: Full Copy) */}
        <button
          type="button"
          onClick={handleLeftClick}
          onContextMenu={handleContextMenu}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer group select-none"
          title="Left Click: Add Step (Keep Pos, Clear Drawings)&#10;Right Click: Duplicate Full Scene"
          aria-label="Add scene (Left-click: Keep Pos, Right-click: Duplicate Full)"
        >
          <Plus
            size={14}
            className="text-blue-400 group-hover:scale-110 transition-transform"
          />
          <span className="font-medium text-[11px]">Add Step</span>
        </button>

        {/* Dropdown toggle for options */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          className="flex items-center justify-center w-6 py-1.5 border-l border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
          title="More scene creation options"
          aria-label="More options"
        >
          <ChevronDown
            size={11}
            className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-white/15 bg-[#1a1a1e] shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Add New Scene
          </div>

          {/* Option 1: Object-free Copy (Default) */}
          <button
            type="button"
            onClick={() => {
              addSlide(activeSlideId, 'object-free');
              setMenuOpen(false);
            }}
            className="w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left hover:bg-blue-600/20 text-white transition-colors cursor-pointer group"
          >
            <Sparkles size={14} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white group-hover:text-blue-300">
                Next Step (Keep Pos)
              </div>
              <div className="text-[10px] text-white/50 leading-tight mt-0.5">
                Copies player & ball positions, clears arrows & zones (Left
                Click)
              </div>
            </div>
          </button>

          {/* Option 2: Full Duplicate */}
          <button
            type="button"
            onClick={() => {
              addSlide(activeSlideId, 'full');
              setMenuOpen(false);
            }}
            className="w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left hover:bg-purple-600/20 text-white transition-colors cursor-pointer group mt-1"
          >
            <Copy size={14} className="text-purple-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white group-hover:text-purple-300">
                Duplicate Full Scene
              </div>
              <div className="text-[10px] text-white/50 leading-tight mt-0.5">
                Exact clone of players and all drawings (Right Click)
              </div>
            </div>
          </button>

          {/* Option 3: Blank 4-4-2 Scene */}
          <button
            type="button"
            onClick={() => {
              addSlide(activeSlideId, 'blank');
              setMenuOpen(false);
            }}
            className="w-full flex items-start gap-2 px-2 py-2 rounded-lg text-left hover:bg-white/10 text-white transition-colors cursor-pointer group mt-1"
          >
            <SquareDashed size={14} className="text-white/60 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white/80 group-hover:text-white">
                Blank Scene
              </div>
              <div className="text-[10px] text-white/40 leading-tight mt-0.5">
                Fresh default formation setup
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
