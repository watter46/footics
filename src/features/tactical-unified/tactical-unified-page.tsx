'use client';

/**
 * tactical-unified-page.tsx
 * Figma-like Layout Orchestrator:
 *  - TopBar with action & toggle icons
 *  - Central Canvas (Maximized)
 *  - Always-visible Right Panel (Formation & Sub-members / Inspector)
 *  - Slide Strip
 *  - Clipboard paste & Image drop support
 */

import dynamic from 'next/dynamic';
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import { useTacticalAutoSave } from '@/features/tactical-unified/hooks/use-tactical-auto-save';
import { useTacticalCaptureBridge } from '@/features/tactical-unified/hooks/use-tactical-capture-bridge';
import { useTacticalDropPaste } from '@/features/tactical-unified/hooks/use-tactical-drop-paste';
import { useTacticalMatchInit } from '@/features/tactical-unified/hooks/use-tactical-match-init';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { ProjectManagerModal } from './panels/dialogs/project-manager-modal';
import { ExportModal } from './panels/export/export-modal';
import { RightPanel } from './panels/right-panel/right-panel';
import { TimelineBar } from './panels/timeline/timeline-bar';
import { TopBar } from './panels/toolbar';

// Canvas はクライアントサイドのみ (Konva)
const UnifiedCanvas = dynamic(
  () =>
    import('./objects/canvas/components/unified-canvas').then(
      (m) => m.UnifiedCanvas,
    ),
  { ssr: false },
);

export interface TacticalUnifiedPageProps {
  initialMatchId?: string;
  initialMinute?: number;
}

export function TacticalUnifiedPage({
  initialMatchId,
  initialMinute,
}: TacticalUnifiedPageProps = {}) {
  // 🎯 URLクエリ or Props (matchId, minute) による試合データの初期配置
  const { hasMatchQuery } = useTacticalMatchInit({
    initialMatchId,
    initialMinute,
  });

  // 💾 プロジェクト自動保存 & リロード時自動復元 (Dexie IndexedDB)
  useTacticalAutoSave({ skipRestore: hasMatchQuery });

  const exportModalOpen = useTacticalUnifiedStore(
    (s) => s.panels.exportModalOpen,
  );
  const projectManagerModalOpen = useTacticalUnifiedStore(
    (s) => s.panels.projectManagerModalOpen,
  );
  const closeProjectManagerModal = useTacticalUnifiedStore(
    (s) => s.closeProjectManagerModal,
  );

  // 🎯 拡張機能からのダイレクトキャプチャ受信・自動配置
  useTacticalCaptureBridge();

  // キーボードショートカット (Delete/Escape)
  useKeyboardShortcuts();

  // 📋 クリップボード画像貼り付け & 📂 ファイルドラッグ＆ドロップ対応
  const { handleDragOver, handleDrop } = useTacticalDropPaste();

  return (
    <div
      role="application"
      aria-label="Tactical Canvas Workspace"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-screen bg-[#0a0a0a] overflow-hidden select-none"
    >
      {/* Top Bar */}
      <TopBar />

      {/* Main Area */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Canvas — 最大化 */}
        <main className="flex-1 relative overflow-hidden flex flex-col bg-[#0a0a0a]">
          <UnifiedCanvas />
        </main>

        {/* Right Panel (常時表示 / アニメーションなし) */}
        <RightPanel />
      </div>

      {/* Timeline Bar */}
      <TimelineBar />

      {/* Export Modal (Portal) */}
      {exportModalOpen && <ExportModal />}

      {/* Project Manager Modal */}
      {projectManagerModalOpen && (
        <ProjectManagerModal
          isOpen={projectManagerModalOpen}
          onClose={closeProjectManagerModal}
        />
      )}
    </div>
  );
}
