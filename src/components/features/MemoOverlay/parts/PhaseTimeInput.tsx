'use client';

import { AlertCircle, Clock } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';

interface PhaseTimeInputProps {
  timeStr: string;
  displayTime: string;
  isInvalid: boolean;
  isEmpty: boolean;
  phase: number;
  validationError: string | null;
  onTimeChange: (val: string) => void;
}

/**
 * PhaseTimeInput
 * 責務: 時間入力フェーズ（Phase 0）のUI。
 * 数字入力・バリデーションフィードバック・パース結果の表示を担う。
 */
export const PhaseTimeInput: React.FC<PhaseTimeInputProps> = ({
  timeStr,
  displayTime,
  isInvalid,
  isEmpty,
  phase,
  validationError,
  onTimeChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposing = useRef(false);

  // フェーズ表示時にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []); // マウント時のみ

  const normalize = (val: string) => {
    // 全角数字を半角に変換し、数字のみ最大5文字
    return val
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/\D/g, '')
      .slice(0, 5);
  };

  return (
    <div className="p-6 flex flex-col items-center gap-6">
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
          // 動画プレイヤー等のショートカットとの干渉を防ぐため、すべてのキーイベントの伝播を止める
          e.stopPropagation();

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
  );
};
