import { FolderOpen } from 'lucide-react';
import type React from 'react';

export const ScreenshotEmptyState: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800/60">
      <FolderOpen className="w-12 h-12 mb-3 text-zinc-600" />
      <p className="text-base font-medium text-zinc-300">
        スクリーンショットがありません
      </p>
      <p className="text-xs text-zinc-500 mt-1 max-w-sm text-center">
        動画再生中に{' '}
        <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300 font-mono text-[10px]">
          Alt + S
        </kbd>{' '}
        を押すと、フレームを自動キャプチャしてクイック編集できます。
      </p>
    </div>
  );
};
