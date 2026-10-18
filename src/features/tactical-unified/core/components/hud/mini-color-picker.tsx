'use client';

import { Pipette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../hooks/use-canvas-store';

export const HUD_COLOR_PALETTE = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#3b82f6',
  '#034694',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#a855f7',
  '#06b6d4',
];

export interface MiniColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  title: string;
  isRing?: boolean;
}

export function MiniColorPicker({
  value,
  onChange,
  title,
  isRing = false,
}: MiniColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const customColor = useCanvasStore((s) => s.customColor);
  const setCustomColor = useCanvasStore((s) => s.setCustomColor);

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
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const normalizedValue =
    value?.startsWith('#') && value.length === 7 ? value : '#ffffff';

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={title}
        aria-label={title}
        className={`w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110 shadow-xs flex items-center justify-center shrink-0 overflow-hidden ${
          isRing ? 'border-2 border-white/80' : 'border border-white/30'
        }`}
        style={{
          colorScheme: 'only light',
          backgroundImage: `linear-gradient(${normalizedValue}, ${normalizedValue})`,
        }}
      >
        <svg
          className="w-full h-full block pointer-events-none"
          viewBox="0 0 20 20"
          style={{ colorScheme: 'only light' }}
        >
          <rect width="20" height="20" fill={normalizedValue} />
        </svg>
        {isRing && (
          <div className="absolute w-1.5 h-1.5 rounded-full bg-[#222222] pointer-events-none" />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="カラーパレット"
          tabIndex={-1}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2.5 bg-[#222222] border border-[#383838] rounded-xl shadow-2xl z-50 flex flex-col gap-2 w-48"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: 192,
            maxWidth: 200,
            backgroundColor: '#222222',
            borderColor: '#383838',
            colorScheme: 'only light',
          }}
        >
          <div className="grid grid-cols-5 gap-1.5">
            {HUD_COLOR_PALETTE.map((c) => {
              const isSelected =
                normalizedValue.toLowerCase() === c.toLowerCase();
              const isWhite = c.toLowerCase() === '#ffffff';
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                  }}
                  className={`w-6 h-6 rounded-md border p-0.5 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center relative overflow-hidden ${
                    isSelected
                      ? 'ring-2 ring-[#0d99ff] border-white scale-105 shadow-md z-10'
                      : isWhite
                        ? 'border-white/60 hover:border-white'
                        : 'border-white/10 hover:border-white/30'
                  }`}
                  style={{
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    minHeight: 24,
                    colorScheme: 'only light',
                    backgroundImage: `linear-gradient(${c}, ${c})`,
                    boxShadow: isSelected
                      ? '0 0 0 2px #0d99ff, 0 0 0 4px #222222'
                      : undefined,
                  }}
                  title={isWhite ? 'White (#ffffff)' : c}
                >
                  <svg
                    className="w-full h-full rounded-[3px] block pointer-events-none"
                    viewBox="0 0 20 20"
                    style={{ colorScheme: 'only light' }}
                  >
                    <rect width="20" height="20" rx="3" fill={c} />
                  </svg>
                </button>
              );
            })}
          </div>
          <div
            className="pt-2 border-t border-[#383838] flex flex-col gap-1.5"
            style={{ borderColor: '#383838' }}
          >
            <div
              className="flex items-center gap-2 p-1.5 rounded-lg bg-[#2a2a2a] border border-[#383838] hover:border-[#4a4a4a] transition-colors relative"
              style={{ backgroundColor: '#2a2a2a', borderColor: '#383838' }}
            >
              <button
                type="button"
                onClick={() => {
                  onChange(customColor);
                  setIsOpen(false);
                }}
                title={`カスタム色 (${customColor}) を適用`}
                className="flex items-center gap-2 flex-1 text-left cursor-pointer overflow-hidden"
              >
                <div
                  className="w-5 h-5 rounded border border-white/20 shrink-0"
                  style={{ backgroundColor: customColor }}
                />
                <span className="font-mono text-[11px] uppercase text-white/90 truncate">
                  {customColor}
                </span>
              </button>
              <label
                title="カラーピッカー"
                className="relative p-1 rounded hover:bg-[#383838] cursor-pointer text-white/70 hover:text-white shrink-0 flex items-center justify-center"
              >
                <Pipette size={14} />
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomColor(val);
                    onChange(val);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
