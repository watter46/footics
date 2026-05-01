'use client';

import { MessageSquare } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';

interface PhaseMemoInputProps {
  memo: string;
  onMemoChange: (val: string) => void;
  onSave: () => void;
}

/**
 * PhaseMemoInput
 * 責務: 補足メモ入力フェーズ（Phase 2）のUI。
 * Ctrl+EnterでのSave連携、フォーカス管理を担う。
 */
export const PhaseMemoInput: React.FC<PhaseMemoInputProps> = ({
  memo,
  onMemoChange,
  onSave,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // フェーズ表示時にフォーカス
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => clearTimeout(timer);
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
            window.dispatchEvent(
              new CustomEvent('footics-action', {
                detail: { action: 'CLOSE_OVERLAY' },
              }),
            );
            return;
          }
          // Ctrl+Enter / Cmd+Enter: 保存
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent('footics-action', {
                detail: { action: 'SAVE_MEMO' },
              }),
            );
            return;
          }
          // Shift+Tab: 前のフェーズへ
          if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            window.dispatchEvent(
              new CustomEvent('footics-action', {
                detail: { action: 'PREV_PHASE' },
              }),
            );
            return;
          }
          // それ以外は動画プレイヤー等への伝播を防ぐ
          e.stopPropagation();
        }}
      />
    </div>
  );
};
