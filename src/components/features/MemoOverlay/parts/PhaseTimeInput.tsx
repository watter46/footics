'use client';

import { AlertCircle, Clock } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useKeyboardShortcut } from '@/hooks/use-shortcut';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';

interface PhaseTimeInputProps {
  timeStr: string;
  displayTime: string;
  isEmpty: boolean;
  phase: number;
  period: number;
  validationError: string | null;
  onTimeChange: (val: string) => void;
  onPeriodChange: (p: number) => void;
}

/**
 * Period colors mapping
 */
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

/**
 * PhaseTimeInput
 * 責務: 時間入力フェーズ（Phase 0）のUI。
 * 数字入力・バリデーションフィードバック・パース結果の表示を担う。
 */
export const PhaseTimeInput: React.FC<PhaseTimeInputProps> = ({
  timeStr,
  displayTime,
  isEmpty,
  phase,
  period,
  validationError,
  onTimeChange,
  onPeriodChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);

  // フェーズ表示時にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []); // マウント時のみ

  // キーボードショートカット管理 (ライブラリを使用)
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

  // フォーカス制御
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // インプット以外にフォーカスがある時、数字キーが押されたらインプットにフォーカスを戻す
      if (
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement) &&
        e.key >= '0' &&
        e.key <= '9' &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        inputRef.current?.focus();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Altキーが離されたらインプットにフォーカスを戻す (ショートカット操作後などの復帰)
      if (e.key === 'Alt') {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const normalize = (val: string) => {
    // 全角数字を半角に変換し、数字のみ最大5文字
    return val
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/\D/g, '')
      .slice(0, 5);
  };

  return (
    <div className="p-6 flex flex-col items-center gap-8">
      {/* ── Period Selector (Segmented Control) ── */}
      <div className="w-full flex p-1 bg-slate-950/40 backdrop-blur-md border border-slate-800/30 rounded-xl relative overflow-hidden group">
        {/* 背景のグロー効果 */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${PERIOD_COLORS[period as keyof typeof PERIOD_COLORS].glow} opacity-20 transition-all duration-500`}
        />
        {[
          { id: 1, label: '1st' },
          { id: 2, label: '2nd' },
          { id: 3, label: 'ET1' },
          { id: 4, label: 'ET2' },
          { id: 5, label: 'PK' },
        ].map((p) => {
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
            // 確定した値を正規化して反映
            const val = (e.target as HTMLInputElement).value;
            onTimeChange(normalize(val));
          }}
          onBlur={(e) => {
            // フォーカスが外れた際にも念のため正規化
            onTimeChange(normalize(e.target.value));
          }}
          onChange={(e) => {
            const val = e.target.value;
            if (isComposing.current) {
              // 変換中はストアにそのまま流す（バリデーションは一時的に無効になるが、入力体験を優先）
              onTimeChange(val);
            } else {
              onTimeChange(normalize(val));
            }
          }}
          placeholder="MMSS"
          className="w-full text-center text-6xl font-mono bg-transparent outline-none text-slate-200 placeholder:text-slate-800 tracking-widest"
          onKeyDown={(e) => {
            // 修飾キーを伴うショートカット（Alt+1-5やCtrl+M等）はバブリングさせてライブラリに拾わせる。
            // それ以外の単体キー（数字入力等）は、動画プレイヤー側のショートカットとの干渉を防ぐため伝播を止める。
            if (!e.altKey && !e.ctrlKey && !e.metaKey) {
              e.stopPropagation();
            }

            if (e.key === 'Enter' || e.key === 'Tab') {
              if (isComposing.current) return; // 変換確定の Enter は無視
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent('footics-action', {
                  detail: { action: 'NEXT_PHASE' },
                }),
              );
            } else if (e.key === 'Backspace') {
              // input の値が空の場合のみ BACKSPACE アクションを発行（文字削除はブラウザ標準に任せる）
              if (timeStr === '') {
                e.preventDefault();
                window.dispatchEvent(
                  new CustomEvent('footics-action', {
                    detail: { action: 'BACKSPACE' },
                  }),
                );
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent('footics-action', {
                  detail: { action: 'CLOSE_OVERLAY' },
                }),
              );
            }
          }}
        />
        <div
          className={`text-sm font-mono h-6 transition-colors ${
            validationError && phase === 0
              ? 'text-red-500 font-bold animate-pulse'
              : 'text-slate-300'
          }`}
        >
          {validationError && phase === 0 ? (
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {validationError}
            </span>
          ) : isEmpty ? (
            'Enter numbers (e.g. 12345)'
          ) : (
            `Parsed: ${displayTime}`
          )}
        </div>
      </div>
    </div>
  );
};
