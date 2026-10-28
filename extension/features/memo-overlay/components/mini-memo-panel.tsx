import {
  AlertCircle,
  LayoutDashboard,
  Maximize2,
  MessageSquare,
  Save,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { sendMessage } from 'webext-bridge/content-script';
import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import { cn } from '~/utils/cn';
import { useMemoSave } from '../hooks/use-memo-save';
import { useOverlayStore } from '../stores/use-overlay-store';

/**
 * MiniMemoPanel (PIP風省スペースメモ入力パネル)
 *
 * 責務: 動画視聴を遮らない右下小型フローティングパネルでの最小限メモ入力と保存。
 */
export function MiniMemoPanel() {
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
        'w-[320px] bg-[#222226] border border-white/[0.08] rounded-[12px] shadow-2xl overflow-hidden font-sans flex flex-col select-none',
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
      <div className="flex items-center justify-between px-3 py-2 bg-[#18181B] border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <MessageSquare
            className="w-3.5 h-3.5 text-[#FF5500]"
            strokeWidth={1.5}
          />
          <span className="text-[11px] font-black text-[#F4F4F5] uppercase tracking-tight">
            {mode === 'MATCH' ? 'Match Memo' : 'Event Memo'}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30 font-mono font-bold">
            MINI
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              sendMessage('OPEN_DASHBOARD', {}, 'background').catch(() => {});
            }}
            title="Dashboard を開く"
            className="p-1 hover:bg-white/[0.05] rounded text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={toggleDisplayMode}
            title="フルモードに切り替え (Alt+M)"
            className="p-1 hover:bg-white/[0.05] rounded text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={close}
            title="閉じる (Esc)"
            className="p-1 hover:bg-white/[0.05] rounded text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
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
          className="w-full bg-[#0D0D0E] border border-white/[0.07] rounded-[8px] p-2 text-xs text-[#F4F4F5] placeholder:text-[#71717A] outline-none focus:border-[#FF5500]/60 transition-all resize-none"
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
          <div className="flex items-center gap-1.5 text-[10px] text-[#EB3B5A] bg-[#EB3B5A]/15 border border-[#EB3B5A]/30 rounded px-2 py-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
            <span className="truncate">{error}</span>
            <button
              type="button"
              onClick={() => setError(undefined)}
              className="ml-auto text-[#EB3B5A]/70 hover:text-[#EB3B5A]"
            >
              <X className="w-2.5 h-2.5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Mini Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[9px] text-[#71717A] font-mono truncate max-w-[130px]">
            {matchId ? `ID: ${matchId}` : 'No Match'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleDisplayMode}
              className="text-[10px] text-[#A1A1AA] hover:text-white font-medium px-2 py-1 rounded hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Full (Alt+M)
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1 bg-[#FF5500] hover:bg-[#ff6a1f] disabled:opacity-35 text-white rounded-[6px] text-xs font-semibold transition-all shadow-[0_0_12px_rgba(255,85,0,0.35)] cursor-pointer"
            >
              <Save className="w-3 h-3" strokeWidth={1.5} />
              <span>保存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
