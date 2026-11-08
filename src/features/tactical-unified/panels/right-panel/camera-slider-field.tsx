'use client';

import React from 'react';

export interface CameraSliderFieldProps {
  id: string;
  label: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  minLabel: string;
  maxLabel: string;
  midLabel?: string;
  midValue?: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
}

function getPrecision(step: number): number {
  const s = step.toString();
  const d = s.indexOf('.');
  return d === -1 ? 0 : s.length - d - 1;
}

function clampValue(
  val: number,
  min: number,
  max: number,
  step: number,
): number {
  const p = Math.max(getPrecision(step), getPrecision(min));
  return Number(Math.max(min, Math.min(max, val)).toFixed(p));
}

export function CameraSliderField({
  id,
  label,
  ariaLabel,
  value,
  min,
  max,
  step = 1,
  unit,
  minLabel,
  maxLabel,
  midLabel,
  midValue,
  onChange,
  onChangeEnd,
}: CameraSliderFieldProps): React.ReactElement {
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value.toString());

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const onChangeEndRef = React.useRef(onChangeEnd);
  onChangeEndRef.current = onChangeEnd;

  const sliderValueRef = React.useRef(value);
  sliderValueRef.current = value;

  const activeCleanupRef = React.useRef<(() => void) | null>(null);
  const justDraggedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isEditing) setInputValue(value.toString());
  }, [value, isEditing]);

  React.useEffect(() => {
    return () => activeCleanupRef.current?.();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startVal = value;
    let currentVal = value;
    let hasMoved = false;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore in test environments
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      if (Math.abs(dx) > 2) {
        hasMoved = true;
        moveEvent.preventDefault();
      }
      const steps = Math.round(dx * 0.1);
      const calculated = clampValue(startVal + steps * step, min, max, step);
      if (calculated !== currentVal) {
        currentVal = calculated;
        sliderValueRef.current = calculated;
        onChangeRef.current(calculated);
      }
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      activeCleanupRef.current = null;
    };

    const onPointerUp = () => {
      cleanup();
      if (hasMoved) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 50);
        onChangeEndRef.current?.(currentVal);
      } else {
        setIsEditing(true);
      }
    };

    const onPointerCancel = () => {
      cleanup();
      if (hasMoved) onChangeEndRef.current?.(currentVal);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    activeCleanupRef.current = cleanup;
  };

  const commitInput = () => {
    setIsEditing(false);
    const parsed = Number.parseFloat(inputValue);
    if (!Number.isNaN(parsed)) {
      const clamped = clampValue(parsed, min, max, step);
      sliderValueRef.current = clamped;
      onChange(clamped);
      onChangeEnd?.(clamped);
    }
  };

  const precision = Math.max(getPrecision(step), getPrecision(min));
  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min)) * 100),
  );

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-black/20 border border-white/[0.06]">
      <div className="flex items-center justify-between">
        <label
          htmlFor={`${id}-number`}
          className="font-medium text-white/80 text-[11px]"
        >
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            id={`${id}-number`}
            data-testid={`${id}-scrubber`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={isEditing ? inputValue : value.toFixed(precision)}
            aria-label={ariaLabel}
            onPointerDown={handlePointerDown}
            onClick={() => {
              if (!justDraggedRef.current) setIsEditing(true);
            }}
            onDoubleClick={() => setIsEditing(true)}
            onChange={(e) => {
              setInputValue(e.target.value);
              const p = Number.parseFloat(e.target.value);
              if (!Number.isNaN(p)) {
                const clamped = clampValue(p, min, max, step);
                sliderValueRef.current = clamped;
                onChange(clamped);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitInput();
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setInputValue(value.toString());
                e.currentTarget.blur();
              }
            }}
            onBlur={commitInput}
            className={`w-14 px-1.5 py-0.5 rounded border text-right font-mono text-[11px] text-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              isEditing
                ? 'bg-white/10 border-[#FF8100]/60 focus:outline-none cursor-text'
                : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 cursor-ew-resize select-none'
            }`}
            title="ドラッグでスクラブ調整 / クリックで数値入力"
          />
          <span className="text-white/40 text-[11px]">{unit}</span>
        </div>
      </div>

      {/* Slider Track with Thin Gray Background, Progress Bar and White Thumb */}
      <div
        data-testid={`${id}-track`}
        className="relative w-full h-2 rounded-full bg-white/15 flex items-center cursor-pointer"
      >
        <div
          data-testid={`${id}-progress`}
          className="absolute left-0 top-0 bottom-0 rounded-full bg-[#FF8100] pointer-events-none"
          style={{ width: `${percentage}%` }}
        />
        <div
          data-testid={`${id}-thumb`}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] pointer-events-none"
          style={{ left: `${percentage}%` }}
        />
        <input
          id={`${id}-range`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => {
            const next = Number.parseFloat(e.target.value);
            sliderValueRef.current = next;
            onChange(next);
          }}
          onPointerUp={() => {
            onChangeEnd?.(sliderValueRef.current);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="relative flex justify-between text-[10px] text-white/40 font-mono">
        <span>{minLabel}</span>
        {midLabel && (
          <span
            role={midValue !== undefined ? 'button' : undefined}
            tabIndex={midValue !== undefined ? 0 : undefined}
            onClick={
              midValue !== undefined
                ? () => {
                    onChange(midValue);
                    onChangeEnd?.(midValue);
                  }
                : undefined
            }
            onKeyDown={
              midValue !== undefined
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onChange(midValue);
                      onChangeEnd?.(midValue);
                    }
                  }
                : undefined
            }
            style={
              midValue !== undefined
                ? {
                    position: 'absolute',
                    left: `${((midValue - min) / (max - min)) * 100}%`,
                    transform: 'translateX(-50%)',
                  }
                : undefined
            }
            className={
              midValue !== undefined
                ? 'cursor-pointer hover:text-white transition-colors select-none'
                : undefined
            }
          >
            {midLabel}
          </span>
        )}
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
