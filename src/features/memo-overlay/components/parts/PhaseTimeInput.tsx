'use client';

import { AlertCircle, Clock } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useKeyboardShortcut } from '@/hooks/use-shortcut';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';

export interface PhaseTimeInputProps {
  timeStr: string;
  displayTime: string;
  isEmptyTime: boolean;
  period: number;
  error: string | undefined;
  onTimeChange: (val: string) => void;
  onPeriodChange: (val: number) => void;
  onClose?: () => void;
  onNextPhase?: () => void;
}

const PERIOD_COLORS = {
  1: {
    active: 'text-indigo-400',
    inactive: 'text-slate-500 hover:text-indigo-300',
    indicator: 'bg-indigo-500/20 border-indigo-500/30 shadow-indigo-500/10',
    glow: 'from-indigo-500/20 to-transparent',
  },
  2: {
    active: 'text-emerald-400',
    inactive: 'text-slate-500 hover:text-emerald-300',
    indicator: 'bg-emerald-500/20 border-emerald-500/30 shadow-emerald-500/10',
    glow: 'from-emerald-500/20 to-transparent',
  },
  3: {
    active: 'text-rose-400',
    inactive: 'text-slate-500 hover:text-rose-300',
    indicator: 'bg-rose-500/20 border-rose-500/30 shadow-rose-500/10',
    glow: 'from-rose-500/20 to-transparent',
  },
  4: {
    active: 'text-violet-400',
    inactive: 'text-slate-500 hover:text-violet-300',
    indicator: 'bg-violet-500/20 border-violet-500/30 shadow-violet-500/10',
    glow: 'from-violet-500/20 to-transparent',
  },
  5: {
    active: 'text-fuchsia-400',
    inactive: 'text-slate-500 hover:text-fuchsia-300',
    indicator: 'bg-fuchsia-500/20 border-fuchsia-500/30 shadow-fuchsia-500/10',
    glow: 'from-fuchsia-500/20 to-transparent',
  },
} as const;

const PERIOD_TABS = [
  { id: 1, label: '1st' },
  { id: 2, label: '2nd' },
  { id: 3, label: 'ET1' },
  { id: 4, label: 'ET2' },
  { id: 5, label: 'PK' },
] as const;

/**
 * PhaseTimeInput
 * 責務: 時間入力フェーズ（Phase 0）のUI。
 * 数字入力・ピリオド選択・パース結果の表示を担う。
 */
export const PhaseTimeInput: React.FC<PhaseTimeInputProps> = ({
  timeStr,
  displayTime,
  isEmptyTime,
  period,
  error,
  onTimeChange,
  onPeriodChange,
  onClose,
  onNextPhase,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };
    focusInput();
    const rafId = requestAnimationFrame(focusInput);
    const t1 = setTimeout(focusInput, 50);
    const t2 = setTimeout(focusInput, 150);
    const t3 = setTimeout(focusInput, 300);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useKeyboardShortcut(SHORTCUT_ACTIONS.SET_PERIOD_1, () => onPeriodChange(1), {
    ignoreInput: false,
  });
  useKeyboardShortcut(SHORTCUT_ACTIONS.SET_PERIOD_2, () => onPeriodChange(2), {
    ignoreInput: false,
  });
  useKeyboardShortcut(SHORTCUT_ACTIONS.SET_PERIOD_3, () => onPeriodChange(3), {
    ignoreInput: false,
  });
  useKeyboardShortcut(SHORTCUT_ACTIONS.SET_PERIOD_4, () => onPeriodChange(4), {
    ignoreInput: false,
  });
  useKeyboardShortcut(SHORTCUT_ACTIONS.SET_PERIOD_5, () => onPeriodChange(5), {
    ignoreInput: false,
  });

  const normalize = useCallback((val: string) => {
    return val
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/[^0-9]/g, '')
      .slice(0, 5);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        e.key.match(/^[0-9]$/) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        inputRef.current?.focus();
        e.preventDefault();
        onTimeChange(normalize(timeStr + e.key));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeStr, onTimeChange, normalize]);

  const activePeriodConfig =
    PERIOD_COLORS[period as keyof typeof PERIOD_COLORS] ?? PERIOD_COLORS[1];

  return (
    <div className="p-6 flex flex-col items-center gap-8">
      {/* Period Selector */}
      <div className="w-full flex p-1 bg-slate-950/40 backdrop-blur-md border border-slate-800/30 rounded-xl relative overflow-hidden group">
        <div
          className={`absolute inset-0 bg-gradient-to-r ${activePeriodConfig.glow} opacity-20 transition-all duration-500`}
        />
        {PERIOD_TABS.map((p) => {
          const config = PERIOD_COLORS[p.id as keyof typeof PERIOD_COLORS];
          const isActive = period === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriodChange(p.id)}
              className={`flex-1 py-1.5 text-[10px] font-black transition-all relative z-10 ${
                isActive ? config.active : config.inactive
              }`}
            >
              {p.label}
              {isActive && (
                <div
                  className={`absolute inset-0 ${config.indicator} rounded-lg -z-10 shadow-lg border transition-all duration-300`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Input & Display */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          <Clock className="w-3 h-3" /> Step 1: Timestamp
        </div>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={timeStr}
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposing.current = false;
            onTimeChange(normalize((e.target as HTMLInputElement).value));
          }}
          onBlur={(e) => onTimeChange(normalize(e.target.value))}
          onChange={(e) => {
            const val = e.target.value;
            onTimeChange(isComposing.current ? val : normalize(val));
          }}
          placeholder="MMSS"
          className="w-full text-center text-6xl font-mono bg-transparent outline-none text-slate-200 placeholder:text-slate-800 tracking-widest"
          onKeyDown={(e) => {
            if (!e.altKey && !e.ctrlKey && !e.metaKey) {
              e.stopPropagation();
            }

            if (
              (e.key === 'Enter' || e.key === 'Tab') &&
              !e.ctrlKey &&
              !e.metaKey
            ) {
              if (isComposing.current) return;
              e.preventDefault();
              onNextPhase?.();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose?.();
            }
          }}
        />
        <div
          className={`text-sm font-mono h-6 transition-colors ${
            error ? 'text-red-500 font-bold animate-pulse' : 'text-slate-300'
          }`}
        >
          {error ? (
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </span>
          ) : isEmptyTime ? (
            'Enter numbers (e.g. 12345)'
          ) : (
            `Parsed: ${displayTime}`
          )}
        </div>
      </div>
    </div>
  );
};
