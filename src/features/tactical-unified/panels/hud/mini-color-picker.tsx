'use client';

import { useEffect, useRef, useState } from 'react';
import { COLOR_PALETTE } from '../../components/common-color-input';

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
          <div className="absolute w-1.5 h-1.5 rounded-full bg-neutral-900 pointer-events-none" />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="カラーパレット"
          tabIndex={-1}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#1b1b1b] border border-white/20 rounded-xl shadow-2xl z-50 flex flex-col gap-1.5 w-44"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ colorScheme: 'only light' }}
        >
          <div className="grid grid-cols-5 gap-1">
            {COLOR_PALETTE.map((c) => {
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
                      ? 'ring-2 ring-sky-400 border-white scale-105 shadow-md z-10'
                      : isWhite
                        ? 'border-white/60 hover:border-white'
                        : 'border-white/10 hover:border-white/30'
                  }`}
                  style={{
                    colorScheme: 'only light',
                    backgroundImage: `linear-gradient(${c}, ${c})`,
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
          <div className="flex items-center justify-between pt-1 border-t border-white/10 px-0.5">
            <span className="text-[10px] text-white/50">カスタム</span>
            <label
              className="relative w-5 h-5 rounded border border-white/30 cursor-pointer overflow-hidden flex items-center justify-center"
              style={{
                colorScheme: 'only light',
                backgroundImage: `linear-gradient(${normalizedValue}, ${normalizedValue})`,
              }}
              title="カラーピッカー"
            >
              <svg
                className="w-full h-full block pointer-events-none"
                viewBox="0 0 20 20"
                style={{ colorScheme: 'only light' }}
              >
                <rect width="20" height="20" rx="2" fill={normalizedValue} />
              </svg>
              <input
                type="color"
                value={normalizedValue}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
