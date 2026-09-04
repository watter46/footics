import { AlertCircle, FileText, Send } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '../../../utils/cn';
import { SuccessToast } from '../../memo-overlay';
import {
  useSidepanelStorageSync,
  useSidepanelStore,
} from '../stores/use-sidepanel-store';

export const SidepanelView: React.FC = () => {
  useSidepanelStorageSync();

  const { text, setText, matchId, isSaving, errorMessage, toast, save } =
    useSidepanelStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // サイドパネルが開いた際の初期フォーカス
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      window.close();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-slate-950 text-white p-6 gap-4 relative select-none',
      )}
    >
      <SuccessToast message={toast.message} isVisible={toast.visible} />

      <div
        className={cn(
          'flex items-center justify-between border-b border-slate-800 pb-3',
        )}
      >
        <div className={cn('flex items-center gap-2')}>
          <FileText className={cn('w-5 h-5 text-amber-500')} />
          <h1
            className={cn(
              'text-lg font-bold tracking-tight text-amber-500 italic',
            )}
          >
            Footics Sidepanel
          </h1>
        </div>

        {matchId ? (
          <span
            className={cn(
              'text-[10px] bg-slate-800/80 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono truncate max-w-[140px]',
            )}
            title={`Match: ${matchId}`}
          >
            Match: {matchId}
          </span>
        ) : (
          <span
            className={cn(
              'text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono',
            )}
          >
            試合未選択
          </span>
        )}
      </div>

      <div
        className={cn(
          'bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 space-y-1',
        )}
      >
        <p className={cn('text-[11px] text-slate-400')}>
          Ctrl + Enter で試合メモを IndexedDB に保存します。
        </p>
      </div>

      {errorMessage && (
        <div
          className={cn(
            'flex items-center gap-2 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs px-3 py-2 rounded-lg',
          )}
        >
          <AlertCircle className={cn('w-4 h-4 shrink-0 text-rose-400')} />
          <p className={cn('text-[11px] leading-tight')}>{errorMessage}</p>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          matchId
            ? '試合メモを入力 (Ctrl+Enter で保存)...'
            : 'Footics本体タブで試合を開いてください...'
        }
        disabled={isSaving}
        className={cn(
          'flex-1 bg-slate-900/60 border border-slate-800 rounded-xl p-4 outline-none focus:border-amber-500/50 transition-all resize-none text-slate-200 text-sm placeholder:text-slate-600 disabled:opacity-50',
        )}
      />

      <div className={cn('flex items-center justify-between pt-1')}>
        <span className={cn('text-[11px] text-slate-500')}>
          Ctrl + Enter で保存 / Esc で閉じる
        </span>

        <button
          type="button"
          onClick={() => save()}
          disabled={isSaving || !text.trim()}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
          )}
        >
          <Send className={cn('w-3.5 h-3.5')} />
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
};
