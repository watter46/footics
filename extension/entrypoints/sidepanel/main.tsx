import '@/app/globals.css';
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { useSidepanelStore } from '../../stores/useSidepanelStore';
import { cn } from '../../utils/cn';

const Sidepanel: React.FC = () => {
  const { text, setText } = useSidepanelStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // サイドパネルが開いた際の初期フォーカス（ブラウザ側に制限される場合あり）
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      window.close();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      // サイドパネル側での保存処理が必要な場合ここに追記
      window.close();
    }
  };

  return (
    <div
      className={cn('flex flex-col h-screen bg-slate-950 text-white p-6 gap-4')}
    >
      <div
        className={cn(
          'flex items-center justify-between border-b border-slate-800 pb-2',
        )}
      >
        <h1
          className={cn(
            'text-xl font-bold tracking-tight text-amber-500 italic',
          )}
        >
          Footics Sidepanel
        </h1>
      </div>

      <div
        className={cn(
          'bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 space-y-2',
        )}
      >
        <p className={cn('text-[11px] text-slate-400')}>
          詳細な分析や設定は、こちらの大画面パネルも利用可能です。
        </p>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="詳細メモ..."
        className={cn(
          'flex-1 bg-slate-900/60 border border-slate-800 rounded-xl p-4 outline-none focus:border-amber-500/50 transition-all resize-none text-slate-200',
        )}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sidepanel />
  </React.StrictMode>,
);
