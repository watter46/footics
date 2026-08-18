'use client';

import { Loader2, Save } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';

interface MatchMemoUnitProps {
  memo: string;
  isSaving: boolean;
  hasMatchId: boolean;
  onMemoChange: (val: string) => void;
  onSave: () => void;
  readOnly?: boolean;
}

/**
 * MatchMemoUnit
 * 責務: 試合総括モード（MATCH）のUI。
 * シングルフェーズのメモ入力と保存ボタンを担う。
 */
export const MatchMemoUnit: React.FC<MatchMemoUnitProps> = ({
  memo,
  isSaving,
  hasMatchId,
  onMemoChange,
  onSave,
  readOnly = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // マウント時にフォーカスを確実に当て、キャレットを末尾に配置
  useEffect(() => {
    if (readOnly) return;
    const focusTextarea = () => {
      const el = textareaRef.current;
      if (el) {
        let activeEl: Element | null = document.activeElement;
        while (activeEl && (activeEl as HTMLElement).shadowRoot?.activeElement) {
          activeEl = (activeEl as HTMLElement).shadowRoot!.activeElement;
        }
        if (activeEl !== el) {
          el.focus();
        }
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    };
    focusTextarea();
    const rafId = requestAnimationFrame(focusTextarea);
    const t1 = setTimeout(focusTextarea, 50);
    const t2 = setTimeout(focusTextarea, 150);
    const t3 = setTimeout(focusTextarea, 300);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [readOnly]);

  // フォーカス制御（Alt+W操作後の復帰・フォーカス外入力の誘導）
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const el = textareaRef.current;
      if (!el) return;

      let activeEl: Element | null = document.activeElement;
      while (activeEl && (activeEl as HTMLElement).shadowRoot?.activeElement) {
        activeEl = (activeEl as HTMLElement).shadowRoot!.activeElement;
      }

      // textarea 以外にフォーカスがある時、通常の文字入力キー（修飾キーなし）が押されたら textarea にフォーカス
      if (
        activeEl !== el &&
        !(activeEl instanceof HTMLInputElement) &&
        !(activeEl instanceof HTMLTextAreaElement) &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        e.key.length === 1
      ) {
        el.focus();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Altキーが離されたら textarea にフォーカスを復帰させる
      if (e.key === 'Alt' || e.key === 'AltGraph') {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [readOnly]);

  return (
    <div className="p-4 flex flex-col gap-3 custom-scrollbar">
      <textarea
        ref={textareaRef}
        value={memo}
        onChange={(e) => !readOnly && onMemoChange(e.target.value)}
        readOnly={readOnly}
        placeholder={
          readOnly ? '試合メモは登録されていません' : '試合全体の総括を記録...'
        }
        className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none custom-scrollbar"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent('footics-action', {
                detail: { action: 'CLOSE_OVERLAY' },
              }),
            );
            return;
          }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            if (!readOnly) {
              onSave();
            }
            return;
          }
          // 修飾キーを伴わない通常の文字入力時は、動画プレイヤー側のショートカットとの干渉を防ぐため伝播を止める
          if (!e.altKey && !e.ctrlKey && !e.metaKey) {
            e.stopPropagation();
          }
        }}
      />
      {!readOnly && (
        <div className="flex justify-between items-center">
          <div className="flex gap-3 text-[9px] text-slate-300 uppercase font-black">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded-sm">
                Esc
              </kbd>{' '}
              Close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded-sm">
                Ctrl+Ent
              </kbd>{' '}
              Save
            </span>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !hasMatchId}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Match Memo
          </button>
        </div>
      )}
    </div>
  );
};
