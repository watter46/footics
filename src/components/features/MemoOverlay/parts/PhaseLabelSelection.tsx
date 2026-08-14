'use client';

import { AlertCircle, Search } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import type { FlattenedEvent } from '@/lib/event-definitions';

interface PhaseLabelSelectionProps {
  labelInput: string;
  suggestions: FlattenedEvent[];
  suggestionIndex: number;
  isListMode: boolean;
  isInvalidLabel: boolean;
  phase: number;
  validationError: string | null;
  onLabelInputChange: (val: string) => void;
  onAddLabel: (label: string) => void;
}

/**
 * PhaseLabelSelection
 * 責務: ラベル選択フェーズ（Phase 1）のUI。
 * テキスト検索・サジェストリスト・選択済みラベルの表示と操作を担う。
 */
export const PhaseLabelSelection: React.FC<PhaseLabelSelectionProps> = ({
  labelInput,
  suggestions,
  suggestionIndex,
  isListMode,
  isInvalidLabel,
  phase,
  validationError,
  onLabelInputChange,
  onAddLabel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  // フェーズ表示時にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // サジェストのスクロール追従
  useEffect(() => {
    if (isListMode && suggestionsContainerRef.current) {
      const container = suggestionsContainerRef.current;
      const activeItem = container.children[suggestionIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [suggestionIndex, isListMode]);

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* プレミアムな検索入力エリア */}
      <div className="relative group">
        <Search
          className={`absolute left-0 top-2 w-5 h-5 transition-all duration-300 ${
            labelInput
              ? 'text-blue-400'
              : 'text-slate-500 group-focus-within:text-blue-500'
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={labelInput}
          onChange={(e) => onLabelInputChange(e.target.value)}
          placeholder="Search match events..."
          className={`w-full bg-transparent border-b pl-8 pb-2 outline-none text-slate-100 placeholder:text-slate-600 text-xl font-bold transition-all duration-300 ${
            isInvalidLabel
              ? 'border-red-500/50'
              : 'border-slate-700 focus:border-blue-500 focus:ring-0'
          }`}
          onKeyDown={(e) => {
            // 修飾キーを伴わない操作（矢印キーでの選択など）のみ伝播を止める。
            // Ctrl+Enter などのグローバルショートカットはバブリングさせてリスナーに任せる。
            if (!e.altKey && !e.ctrlKey && !e.metaKey) {
              e.stopPropagation();
            }

            // Shift+Tab: 前のフェーズへ（ArrowDown/Up の前に判定すること）
            if (e.key === 'Tab' && e.shiftKey) {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent('footics-action', {
                  detail: { action: 'PREV_PHASE' },
                }),
              );
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              window.dispatchEvent(
                new CustomEvent('footics-action', {
                  detail: { action: 'NAVIGATE_SUGGESTION', key: e.key },
                }),
              );
            } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              // サジェストリストが表示されている、または入力がある場合は確定
              window.dispatchEvent(
                new CustomEvent('footics-action', {
                  detail: { action: 'NEXT_PHASE' },
                }),
              );
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
        {/* インジケーターバー */}
        <div
          className={`absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-500 ease-out ${
            labelInput ? 'w-full' : 'w-0'
          }`}
        />
      </div>

      {/* バリデーションエラー */}
      {validationError && phase === 1 && (
        <div className="text-[10px] text-red-500 font-bold flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3" /> {validationError}
        </div>
      )}

      {/* サジェストリスト */}
      <div
        ref={suggestionsContainerRef}
        className="flex-1 flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar pr-1"
      >
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={`px-3 py-1.5 rounded text-xs flex justify-between items-center cursor-pointer transition-all ${
              isListMode && i === suggestionIndex
                ? 'bg-slate-800 text-white font-bold ring-1 ring-slate-600'
                : 'text-slate-400 hover:bg-slate-800/30'
            }`}
            onClick={() => {
              onAddLabel(s.label);
              inputRef.current?.focus();
            }}
          >
            <span>{s.label}</span>
            <span
              className="text-[10px] h-4 px-2 flex items-center justify-center rounded-sm bg-slate-950 font-black shadow-inner"
              style={{
                color: s.groupColor,
                border: `1px solid ${s.groupColor}60`,
              }}
            >
              {s.groupName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
