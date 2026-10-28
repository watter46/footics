'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

export interface MatchMemoUnitProps {
  memo: string;
  isSaving: boolean;
  hasMatchId: boolean;
  readOnly?: boolean;
  onMemoChange: (val: string) => void;
  onSave: () => void;
  onClose?: () => void;
}

/**
 * MatchMemoUnit
 * 責務: 試合総括モード（MATCH）のUI。
 * シングルフェーズのメモ入力と保存ボタンを担う。
 */
export function MatchMemoUnit({
  memo,
  isSaving,
  hasMatchId,
  onMemoChange,
  onSave,
  readOnly = false,
  onClose,
}: MatchMemoUnitProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // マウント時にフォーカスを確実に当て、キャレットを末尾に配置
  useEffect(() => {
    if (readOnly) return;
    const focusTextarea = () => {
      const el = textareaRef.current;
      if (el) {
        let activeEl: Element | null = document.activeElement;
        while (
          activeEl &&
          (activeEl as HTMLElement).shadowRoot?.activeElement
        ) {
          activeEl =
            (activeEl as HTMLElement).shadowRoot?.activeElement ?? null;
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
        activeEl = (activeEl as HTMLElement).shadowRoot?.activeElement ?? null;
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
        className="w-full h-48 bg-surface-l1 border border-white/[0.08] rounded-lg p-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-accent-orange focus:ring-1 focus:ring-accent-orange/50 transition-all resize-none custom-scrollbar"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose?.();
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
          <div className="flex gap-3 text-[9px] text-white/60 uppercase font-black">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-l2 border border-white/[0.08] rounded-sm text-white/80">
                Esc
              </kbd>{' '}
              Close
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-surface-l2 border border-white/[0.08] rounded-sm text-white/80">
                Ctrl+Ent
              </kbd>{' '}
              Save
            </span>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onSave}
            disabled={isSaving || !hasMatchId}
            className="flex items-center gap-2 px-6 font-bold"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Match Memo
          </Button>
        </div>
      )}
    </div>
  );
}
