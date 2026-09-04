'use client';

/**
 * slide-context-menu.tsx
 * Right-click context menu for SlideCard
 */

import { ArrowLeft, ArrowRight, Copy, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface SlideContextMenuProps {
  x: number;
  y: number;
  slideId: string;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  onDuplicate: (id: string) => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function SlideContextMenu({
  x,
  y,
  slideId,
  canDelete,
  canMoveLeft,
  canMoveRight,
  onDuplicate,
  onMoveLeft,
  onMoveRight,
  onDelete,
  onClose,
}: SlideContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = () => onClose();
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      className="fixed z-50 min-w-[140px] bg-[#1a1a22] border border-white/15 rounded-lg shadow-xl py-1 text-xs text-white/90 backdrop-blur-md"
      style={{
        left: Math.min(x, window.innerWidth - 150),
        top: Math.max(10, y - 120),
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <button
        type="button"
        onClick={() => { onClose(); onDuplicate(slideId); }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-white/10 hover:text-white cursor-pointer"
      >
        <Copy size={13} className="text-purple-400" />
        <span>シーンを複製</span>
      </button>

      {canMoveLeft && (
        <button
          type="button"
          onClick={() => { onClose(); onMoveLeft(); }}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <ArrowLeft size={13} className="text-blue-400" />
          <span>左へ移動</span>
        </button>
      )}

      {canMoveRight && (
        <button
          type="button"
          onClick={() => { onClose(); onMoveRight(); }}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <ArrowRight size={13} className="text-blue-400" />
          <span>右へ移動</span>
        </button>
      )}

      {canDelete && (
        <>
          <div className="h-px bg-white/10 my-1" />
          <button
            type="button"
            onClick={() => { onClose(); onDelete(slideId); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>シーンを削除</span>
          </button>
        </>
      )}
    </div>
  );
}
