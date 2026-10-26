'use client';

import {
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';

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
  const customColor = useCanvasStore((s) => s.customColor);
  const setCustomColor = useCanvasStore((s) => s.setCustomColor);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  const normalizedValue =
    value?.startsWith('#') && value.length === 7 ? value : '#ffffff';

  return (
    <div className="relative flex items-center">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
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
          ref={refs.setFloating}
          {...getFloatingProps()}
          role="dialog"
          aria-label="カラーパレット"
          tabIndex={-1}
          className="p-2.5 bg-[#222222] border border-[#383838] rounded-xl shadow-2xl z-50 flex flex-col gap-2 w-48"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            ...floatingStyles,
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
                    setCustomColor(c);
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
            <HexColorPicker
              color={normalizedValue}
              onChange={(c) => {
                setCustomColor(c);
                onChange(c);
              }}
              style={{ width: '100%', height: 120 }}
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-white/80 px-1 pt-1">
              <span>{normalizedValue.toUpperCase()}</span>
              <div
                className="w-4 h-4 rounded border border-white/30"
                style={{ backgroundColor: normalizedValue }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
