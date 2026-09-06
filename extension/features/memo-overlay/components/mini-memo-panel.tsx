import { AlertCircle, Maximize2, MessageSquare, Save, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import { cn } from '../../../utils/cn';
import { useMemoSave } from '../hooks/use-memo-save';
import { useOverlayStore } from '../stores/use-overlay-store';

/**
 * MiniMemoPanel (PIP風省スペースメモ入力パネル)
 *
 * 責務: 動画視聴を遮らない右下小型フローティングパネルでの最小限メモ入力と保存。
 */
export const MiniMemoPanel: React.FC = () => {
  const { mode, matchId, close, toggleDisplayMode } = useOverlayStore();
  const memo = useMemoOverlayStore((s) => s.memo);
  const setMemo = useMemoOverlayStore((s) => s.setMemo);
  const isSaving = useMemoOverlayStore((s) => s.isSaving);
  const error = useMemoOverlayStore((s) => s.error);
  const setError = useMemoOverlayStore((s) => s.setError);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { handleSave } = useMemoSave();

  // マウント時にテキストエリアへオートフォーカス
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
    const timer = setTimeout(focusTextarea, 50);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Mini Memo Overlay"
      className={cn(
        'w-[320px] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans flex flex-col',
      )}
      onKeyDown={(e) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) {
          return;
        }
        e.stopPropagation();
      }}
    >
      {/* Mini Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-black text-slate-200 uppercase tracking-tight">
            {mode === 'MATCH' ? 'Match Memo' : 'Event Memo'}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-bold">
            MINI
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleDisplayMode}
            title="フルモードに切り替え (Alt+M)"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={close}
            title="閉じる (Esc)"
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini Textarea Body */}
      <div className="p-2.5 flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモを入力... (Ctrl+Enterで保存)"
          rows={4}
          className="w-full bg-slate-950/90 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-500/60 transition-all resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              close();
              return;
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
              return;
            }
            if (
              e.altKey &&
              (e.key === 'm' || e.key === 'M' || e.code === 'KeyM')
            ) {
              e.preventDefault();
              e.stopPropagation();
              toggleDisplayMode();
              return;
            }
            e.stopPropagation();
          }}
        />

        {error && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-950/60 border border-red-800/50 rounded px-2 py-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{error}</span>
            <button
              type="button"
              onClick={() => setError(undefined)}
              className="ml-auto text-red-400 hover:text-red-200"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* Mini Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[9px] text-slate-500 font-mono truncate max-w-[130px]">
            {matchId ? `ID: ${matchId}` : 'No Match'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleDisplayMode}
              className="text-[10px] text-slate-400 hover:text-slate-200 font-medium px-2 py-1 rounded hover:bg-slate-800/80 transition-colors"
            >
              Full (Alt+M)
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs font-bold transition-all shadow-md shadow-amber-900/30"
            >
              <Save className="w-3 h-3" />
              <span>保存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
