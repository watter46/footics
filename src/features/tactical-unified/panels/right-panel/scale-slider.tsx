'use client';

export interface ScaleSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function ScaleSlider({
  id,
  label,
  value,
  onChange,
  min = 0.5,
  max = 2.0,
  step = 0.1,
}: ScaleSliderProps) {
  return (
    <div className="flex flex-col gap-1 px-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <label htmlFor={id} className="text-white/60 font-medium">
          {label}
        </label>
        <span className="font-mono text-white/80 text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
          {value.toFixed(1)}x
        </span>
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
