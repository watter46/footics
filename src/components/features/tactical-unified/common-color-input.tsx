'use client';

/**
 * common-color-input.tsx
 * Reusable dark-mode compatible color picker & palette for Tactical Unified
 */

export const COLOR_PALETTE = [
  '#ffffff', // White
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#a855f7', // Purple
  '#06b6d4', // Cyan
];

export function ColorInput({
  value,
  onChange,
  className = 'w-[70%]',
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const normalizedValue =
    value.startsWith('#') && value.length === 7 ? value : '#ffffff';

  return (
    <div
      className={`space-y-1.5 ${className}`}
      style={{ colorScheme: 'only light' }}
    >
      <div className="grid grid-cols-4 gap-1">
        {COLOR_PALETTE.map((c) => {
          const isSelected = value.toLowerCase() === c.toLowerCase();
          const isWhite = c.toLowerCase() === '#ffffff';
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-full aspect-square rounded-md border p-0.5 transition-all cursor-pointer flex items-center justify-center relative overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-blue-500 border-white scale-105 shadow-md z-10'
                  : isWhite
                    ? 'border-white/60 hover:border-white hover:scale-105'
                    : 'border-white/10 hover:border-white/30 hover:scale-105'
              }`}
              style={{
                colorScheme: 'only light',
                backgroundImage: `linear-gradient(${c}, ${c})`,
              }}
              title={isWhite ? 'White (#ffffff)' : c}
            >
              {/* Edge/Chrome forced dark mode inversion prevention via SVG rect */}
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
      <div className="flex items-center gap-1.5">
        <label
          className="relative w-5 h-5 rounded border border-white/40 cursor-pointer shrink-0 overflow-hidden flex items-center justify-center shadow-xs"
          style={{
            colorScheme: 'only light',
            backgroundImage: `linear-gradient(${normalizedValue}, ${normalizedValue})`,
          }}
          title="Open color picker"
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
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-white/80 focus:outline-none focus:border-blue-500 uppercase"
        />
      </div>
    </div>
  );
}
