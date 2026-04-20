import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  type ExportStatus,
  type ExportType,
  useEditorStore,
} from '@/stores/useEditorStore';
import { CanvasContainer } from './Canvas';

export const Workspace: React.FC = () => {
  const { dispatchCopy, dispatchSave, exportStatus, lastExportType } =
    useEditorStore();
  const [showToast, setShowToast] = useState(false);
  // トースト表示中にステータスが idle に戻っても表示を維持するためのローカルステート
  const [toastData, setToastData] = useState<{
    status: ExportStatus;
    type: ExportType | null;
  } | null>(null);

  useEffect(() => {
    if (exportStatus === 'success' || exportStatus === 'error') {
      setToastData({ status: exportStatus, type: lastExportType });
      setShowToast(true);
    }
  }, [exportStatus, lastExportType]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const isExporting = exportStatus === 'loading';
  // 表示中のデータを使用。データがない場合は何も表示しない（showToastで隠れるが念のため）
  const activeStatus = toastData?.status || 'idle';
  const activeType = toastData?.type || null;

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white selection:bg-blue-500/30 font-sans">
      {/* Toast Notification */}
      <div
        className={cn(
          'fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform',
          showToast
            ? 'translate-y-0 opacity-100'
            : '-translate-y-12 opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-neutral-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 min-w-[320px]">
          {activeStatus === 'success' ? (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  エクスポート完了
                </p>
                <p className="text-xs text-neutral-400">
                  {activeType === 'copy'
                    ? 'クリップボードにコピーしました'
                    : '画像を保存しました'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  エラーが発生しました
                </p>
                <p className="text-xs text-neutral-400">
                  もう一度お試しください
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Header / Top Toolbar */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-neutral-900/40 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/20 group transition-all hover:scale-105 active:scale-95 cursor-default">
            <span className="font-black text-lg text-white tracking-tighter">
              VC
            </span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm tracking-tight text-neutral-100 uppercase leading-none">
              Video Canvas
            </h1>
            <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-[0.2em] mt-1">
              Creative Editor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Action buttons trigger via Zustand store to Canvas component */}
          <button
            type="button"
            onClick={dispatchCopy}
            disabled={isExporting}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 overflow-hidden',
              'bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 hover:border-white/10',
            )}
          >
            {isExporting && lastExportType === 'copy' ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <Copy className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
            )}
            <span className="relative z-10">画像をコピー</span>
            <span className="hidden sm:inline-block ml-1 opacity-40 font-normal">
              ⌘C
            </span>
          </button>

          <button
            type="button"
            onClick={dispatchSave}
            disabled={isExporting}
            className={cn(
              'group relative flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 overflow-hidden shadow-lg',
              'bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-blue-600/20',
            )}
          >
            {isExporting && lastExportType === 'save' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="relative z-10">画像を保存</span>
            <span className="hidden sm:inline-block ml-1 opacity-60 font-normal text-[10px] border border-white/20 rounded px-1">
              ⌘S
            </span>

            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative bg-[#0a0a0a]">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Central Canvas Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center tldraw-wrapper z-10">
          <CanvasContainer />
        </div>
      </main>
    </div>
  );
};
