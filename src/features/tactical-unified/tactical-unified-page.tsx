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

import { DndContext, type DragEndEvent, pointerWithin } from '@dnd-kit/core';
import dynamic from 'next/dynamic';
import { useRef } from 'react';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { calculateDropPitchCoords } from '@/features/tactical-unified/core/utils/dnd-coordinates';
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import { useTacticalAutoSave } from '@/features/tactical-unified/hooks/use-tactical-auto-save';
import { useTacticalDropPaste } from '@/features/tactical-unified/hooks/use-tactical-drop-paste';
import { useTacticalMatchInit } from '@/features/tactical-unified/hooks/use-tactical-match-init';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { ProjectManagerModal } from './panels/dialogs/project-manager-modal';
import { ExportModal } from './panels/export/export-modal';
import { RightPanel } from './panels/right-panel/right-panel';
import { TimelineBar } from './panels/timeline/timeline-bar';
import { TopBar } from './panels/toolbar';

// Canvas はクライアントサイドのみ (Konva)
const FullTacticalCanvas = dynamic(
  () => import('./views/FullTacticalCanvas').then((m) => m.FullTacticalCanvas),
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
  const { matchId } = useTacticalMatchInit({
    initialMatchId,
    initialMinute,
  });

  // 💾 プロジェクト自動保存 & リロード時自動復元 (Dexie IndexedDB)
  useTacticalAutoSave({ matchId });

  const exportModalOpen = useTacticalUnifiedStore(
    (s) => s.panels.exportModalOpen,
  );
  const projectManagerModalOpen = useTacticalUnifiedStore(
    (s) => s.panels.projectManagerModalOpen,
  );
  const closeProjectManagerModal = useTacticalUnifiedStore(
    (s) => s.closeProjectManagerModal,
  );

  // キーボードショートカット (Delete/Escape)
  useKeyboardShortcuts();

  // 📋 クリップボード画像貼り付け & 📂 ファイルドラッグ＆ドロップ対応
  const { handleDragOver, handleDrop } = useTacticalDropPaste();

  const canvasRef = useRef<CanvasCoreHandle | null>(null);

  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const movePlayerToBench = useTacticalUnifiedStore((s) => s.movePlayerToBench);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);

  const handleDndEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    if (
      activeData?.type === 'bench-player' &&
      over.id === 'tactical-pitch-droppable'
    ) {
      const activator = event.activatorEvent as MouseEvent | TouchEvent;
      const clientX =
        'clientX' in activator ? activator.clientX + event.delta.x : 0;
      const clientY =
        'clientY' in activator ? activator.clientY + event.delta.y : 0;

      let normCoords = { x: 50, y: 50 };
      if (over.rect) {
        normCoords = calculateDropPitchCoords(over.rect, { clientX, clientY });
      }

      movePlayerToPitch(
        activeSlideId,
        activeData.playerId,
        normCoords.x,
        normCoords.y,
      );
    } else if (over.id === 'tactical-bench-droppable') {
      const playerId =
        activeData?.playerId ||
        String(active.id).replace('pitch-player-', '').replace('marker-', '');
      if (playerId) {
        movePlayerToBench(activeSlideId, playerId);
      }
    }
  };

  return (
    <DndContext onDragEnd={handleDndEnd} collisionDetection={pointerWithin}>
      <div
        role="application"
        aria-label="Tactical Canvas Workspace"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex flex-col h-screen w-screen bg-[#0a0a0a] overflow-hidden select-none"
      >
        {/* Top Bar */}
        <TopBar canvasRef={canvasRef} />

        {/* Main Area */}
        <div className="flex flex-1 min-h-0 relative">
          {/* Canvas — 最大化 */}
          <main className="flex-1 relative overflow-hidden flex flex-col bg-[#0a0a0a]">
            <FullTacticalCanvas ref={canvasRef} />
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
    </DndContext>
  );
}
