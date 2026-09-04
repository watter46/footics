'use client';

import { useEffect, useRef, useState } from 'react';
import { COLOR_PALETTE } from '../common-color-input';

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
        className={`w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110 shadow-xs flex items-center justify-center shrink-0 ${
          isRing ? 'border-2 border-white/80' : 'border border-white/30'
        }`}
        style={{ backgroundColor: normalizedValue }}
      >
        {isRing && <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />}
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
        >
          <div className="grid grid-cols-5 gap-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setIsOpen(false);
                }}
                className={`w-6 h-6 rounded-md border p-0.5 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center ${
                  normalizedValue.toLowerCase() === c.toLowerCase()
                    ? 'ring-2 ring-sky-400 border-white'
                    : 'border-white/10 hover:border-white/30'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/10 px-0.5">
            <span className="text-[10px] text-white/50">カスタム</span>
            <label
              className="relative w-5 h-5 rounded border border-white/30 cursor-pointer overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: normalizedValue }}
              title="カラーピッカー"
            >
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
