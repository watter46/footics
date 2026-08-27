'use client';

/**
 * tactical-unified-page.tsx
 * Root orchestrator — 画面の90〜95%がピッチになるレイアウトを統括
 *
 * Layout:
 *   ┌─ TopBar (minimal, ~40px) ─────────────────────────────────┐
 *   │ ┌─ SidePanel (折りたたみ, ~280px) ─┐ ┌─ Canvas ──────────┐ │
 *   │ │  Layers / Player Palette         │ │  Pitch + Toolbar  │ │
 *   │ └──────────────────────────────────┘ └───────────────────┘ │
 *   │                                    [Inspector (右, 260px)] │
 *   ├─ SlideStrip (~64px) ──────────────────────────────────────┤
 *   └───────────────────────────────────────────────────────────┘
 */

import dynamic from 'next/dynamic';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { ExportModal } from './export/export-modal';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { InspectorPanel } from './inspector/inspector-panel';
import { SidePanel } from './sidebar/side-panel';
import { SlideStrip } from './slides/slide-strip';
import { TopBar } from './toolbar/top-bar';

// Canvas はクライアントサイドのみ (Konva)
const UnifiedCanvas = dynamic(
  () => import('./canvas/unified-canvas').then((m) => m.UnifiedCanvas),
  { ssr: false },
);

export function TacticalUnifiedPage() {
  const sidebarOpen = useTacticalUnifiedStore((s) => s.panels.sidebarOpen);
  const inspectorOpen = useTacticalUnifiedStore((s) => s.panels.inspectorOpen);
  const setInspectorOpen = useTacticalUnifiedStore((s) => s.setInspectorOpen);
  const exportModalOpen = useTacticalUnifiedStore(
    (s) => s.panels.exportModalOpen,
  );

  // キーボードショートカット (Delete/Escape)
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0a0a] overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Main Area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Side Panel (Drawer) — アニメーション遷移 */}
        <aside
          style={{ width: sidebarOpen ? 260 : 0 }}
          className={`shrink-0 h-full overflow-hidden transition-[width,opacity] duration-300 ease-in-out z-30 ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-[260px] min-w-[260px] h-full">
            <SidePanel open={sidebarOpen} />
          </div>
        </aside>

        {/* Canvas — 最大化 */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          <UnifiedCanvas />

          {/* 右パネルが閉じている時のクイック開くタブ */}
          {!inspectorOpen && (
            <button
              type="button"
              onClick={() => setInspectorOpen(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 px-1.5 py-3 rounded-l-lg bg-white/10 hover:bg-white/20 border border-r-0 border-white/15 text-white/60 hover:text-white backdrop-blur-md transition-all shadow-lg text-[10px] flex flex-col items-center gap-1"
              title="インスペクターを開く"
              aria-label="インスペクターを開く"
            >
              <span>◀</span>
              <span className="[writing-mode:vertical-rl] tracking-widest text-[9px] font-bold opacity-70">
                PROPERTIES
              </span>
            </button>
          )}
        </main>

        {/* Inspector Panel (右側) — アニメーション遷移 */}
        <aside
          style={{ width: inspectorOpen ? 280 : 0 }}
          className={`shrink-0 h-full bg-[#111] overflow-hidden transition-[width,opacity] duration-300 ease-in-out z-30 ${
            inspectorOpen
              ? 'border-l border-white/10 opacity-100'
              : 'border-l-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="w-[280px] min-w-[280px] h-full overflow-y-auto">
            <InspectorPanel />
          </div>
        </aside>
      </div>

      {/* Slide Strip */}
      <SlideStrip />

      {/* Export Modal (Portal) */}
      {exportModalOpen && <ExportModal />}
    </div>
  );
}
