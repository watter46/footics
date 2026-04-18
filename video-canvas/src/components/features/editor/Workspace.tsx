import type React from 'react';
import { useRef } from 'react';
import { useEditorStore } from '@/stores/useEditorStore';
import { CanvasContainer } from './Canvas';

export const Workspace: React.FC = () => {
  const { dispatchCopy, dispatchSave } = useEditorStore();
  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white selection:bg-blue-500/30">
      {/* Header / Top Toolbar */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-neutral-900/50 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-black text-sm text-white">VC</span>
          </div>
          <h1 className="font-semibold text-sm tracking-tight text-neutral-200">
            Video Canvas{' '}
            <span className="text-neutral-500 font-normal">/ Project 1</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Action buttons trigger via Zustand store to Canvas component */}
          <button
            onClick={dispatchCopy}
            className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-medium transition-all"
          >
            画像をコピー
          </button>
          <button
            onClick={dispatchSave}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            画像を保存
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* Central Canvas Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center tldraw-wrapper">
          <CanvasContainer />
        </div>
      </main>
    </div>
  );
};
