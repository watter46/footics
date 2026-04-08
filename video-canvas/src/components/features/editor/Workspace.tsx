import React from 'react';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { CanvasContainer } from './Canvas';
import { useEditorStore } from '../../../stores/useEditorStore';

export const Workspace: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white selection:bg-blue-500/30">
      {/* Header / Top Toolbar */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-neutral-900/50 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="font-black text-sm text-white">VC</span>
          </div>
          <h1 className="font-semibold text-sm tracking-tight text-neutral-200">Video Canvas <span className="text-neutral-500 font-normal">/ Project 1</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-medium transition-all">Export</button>
          <button className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-medium transition-all shadow-lg shadow-blue-600/20">Save</button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* Float Toolbar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Toolbar />
        </div>

        {/* Central Canvas Area */}
        <div className="flex-1 bg-neutral-950 relative overflow-hidden flex items-center justify-center">
          <CanvasContainer />
        </div>

        {/* Right Sidebar */}
        <aside className="w-72 border-l border-white/10 bg-neutral-900/40 backdrop-blur-md flex flex-col z-40">
          <Sidebar />
        </aside>
      </main>

      {/* Footer / Status */}
      <footer className="h-8 border-t border-white/10 bg-neutral-900/80 px-4 flex items-center text-[10px] text-neutral-500 uppercase tracking-widest font-medium">
        Ready • Layer Count: 0 • Zoom: 100%
      </footer>
    </div>
  );
};
