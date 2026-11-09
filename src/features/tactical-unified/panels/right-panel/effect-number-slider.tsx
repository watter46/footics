'use client';

export interface NumberSliderFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

export function NumberSliderField({
  id,
  label,
  value,
  min,
  max,
  step = 0.1,
  unit = 's',
  onChange,
}: NumberSliderFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px]">
        <label htmlFor={id} className="text-white/70 font-medium">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            id={`${id}-num`}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = Number.parseFloat(e.target.value);
              if (!Number.isNaN(val)) {
                onChange(Math.min(max, Math.max(min, val)));
              }
            }}
            className="w-14 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-right font-mono text-[11px] text-white focus:outline-none focus:border-[#FF8100]/60"
          />
          <span className="text-white/40 text-[10px]">{unit}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full accent-[#FF8100] cursor-pointer h-1.5 bg-white/10 rounded-lg"
      />
    </div>
  );
}
