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
import { useEffect, useRef, useState } from 'react';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { calculateDropPitchCoords } from '@/features/tactical-unified/core/utils/dnd-coordinates';
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import { useTacticalAutoSave } from '@/features/tactical-unified/hooks/use-tactical-auto-save';
import { useTacticalDropPaste } from '@/features/tactical-unified/hooks/use-tactical-drop-paste';
import { useTacticalMatchInit } from '@/features/tactical-unified/hooks/use-tactical-match-init';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { ProjectManagerModal } from './panels/dialogs/project-manager-modal';
import { ExportModal } from './panels/export/export-modal';
import { LeftPanel } from './panels/left-panel/left-panel';
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
  const sidebarOpen = useTacticalUnifiedStore((s) => s.panels.sidebarOpen);

  const [isFocusMode, setIsFocusMode] = useState(false);

  // Focus Mode toggle via shortcut '\'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === '\\') {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // キーボードショートカット (Delete/Escape)
  useKeyboardShortcuts();

  // 📋 クリップボード画像貼り付け & 📂 ファイルドラッグ＆ドロップ対応
  const { handleDragOver, handleDrop } = useTacticalDropPaste();

  const canvasRef = useRef<CanvasCoreHandle | null>(null);

  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const movePlayerToBench = useTacticalUnifiedStore((s) => s.movePlayerToBench);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const setActiveSlide = useTacticalUnifiedStore((s) => s.setActiveSlide);
  const addSlide = useTacticalUnifiedStore((s) => s.addSlide);

  const handleDndEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    if (
      activeData?.type === 'bench-player' &&
      over.id === 'tactical-pitch-droppable'
    ) {
      const activator = event.activatorEvent as
        | MouseEvent
        | TouchEvent
        | PointerEvent;
      let rawClientX = 0;
      let rawClientY = 0;
      if ('clientX' in activator) {
        rawClientX = activator.clientX;
        rawClientY = activator.clientY;
      } else if (
        'touches' in activator &&
        (activator as TouchEvent).touches[0]
      ) {
        rawClientX = (activator as TouchEvent).touches[0]!.clientX;
        rawClientY = (activator as TouchEvent).touches[0]!.clientY;
      }
      const clientX = rawClientX + event.delta.x;
      const clientY = rawClientY + event.delta.y;

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
        className="flex flex-col h-[100dvh] w-screen bg-[#0D0D0E] overflow-hidden select-none touch-manipulation"
      >
        {/* Top Bar */}
        <TopBar
          canvasRef={canvasRef}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
        />

        {/* Main Area (3-Pane Workspace) */}
        <div className="flex flex-1 min-h-0 relative">
          {/* Left Panel (Tactical Sequences / Toggleable) */}
          {!isFocusMode && sidebarOpen && (
            <LeftPanel
              slides={slides}
              activeSlideId={activeSlideId}
              onSelectSlide={setActiveSlide}
              onAddSlide={() => addSlide('duplicate')}
            />
          )}

          {/* Canvas — 最大化 */}
          <main className="flex-1 relative overflow-hidden flex flex-col bg-[#0D0D0E]">
            <FullTacticalCanvas ref={canvasRef} />
          </main>

          {/* Right Panel (Formation & Squad / Focus Mode対応) */}
          {!isFocusMode && <RightPanel />}
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
