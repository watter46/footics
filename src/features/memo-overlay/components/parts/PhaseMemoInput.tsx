'use client';

import { MessageSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface PhaseMemoInputProps {
  memo: string;
  onMemoChange: (val: string) => void;
  onClose?: () => void;
  onSave?: () => void;
  onPrevPhase?: () => void;
}

/**
 * PhaseMemoInput
 * 責務: 補足メモ入力フェーズ（Phase 2）のUI。
 * Ctrl+EnterでのSave連携、フォーカス管理を担う。
 */
export function PhaseMemoInput({
  memo,
  onMemoChange,
  onClose,
  onSave,
  onPrevPhase,
}: PhaseMemoInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // フェーズ表示時にフォーカス
  useEffect(() => {
    const focusTextarea = () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
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
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        <MessageSquare className="w-3 h-3" /> Step 3: Memo (Optional)
      </div>
      <textarea
        ref={textareaRef}
        value={memo}
        onChange={(e) => onMemoChange(e.target.value)}
        placeholder="補足メモを入力..."
        className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 outline-none focus:border-blue-500 transition-all resize-none"
        onKeyDown={(e) => {
          // Escape: オーバーレイを閉じる
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose?.();
            return;
          }
          // Ctrl+Enter / Cmd+Enter: 保存
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            onSave?.();
            return;
          }
          // Shift+Tab: 前のフェーズへ
          if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            onPrevPhase?.();
            return;
          }
          // それ以外は動画プレイヤー等への伝播を防ぐ
          e.stopPropagation();
        }}
      />
    </div>
  );
}
