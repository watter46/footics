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
import { useRef, useState } from 'react';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { handleTacticalDndEnd } from '@/features/tactical-unified/core/utils/dnd-coordinates';
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import { useTacticalAutoSave } from '@/features/tactical-unified/hooks/use-tactical-auto-save';
import { useTacticalDropPaste } from '@/features/tactical-unified/hooks/use-tactical-drop-paste';
import { useTacticalShortcuts } from '@/features/tactical-unified/hooks/use-tactical-shortcuts';
import type { TacticalUnifiedState } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  TacticalUnifiedStoreProvider,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { ProjectManagerModal } from './panels/dialogs/project-manager-modal';
import { ExportModal } from './panels/export/export-modal';
import { LeftPanel } from './panels/left-panel/left-panel';
import { RightPanel } from './panels/right-panel/right-panel';
import { TacticalSplitPreviewPanel } from './panels/split-preview/tactical-split-preview-panel';
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
  initialState?: Partial<TacticalUnifiedState>;
}

export function TacticalUnifiedPage({
  initialMatchId,
  initialMinute,
  initialState,
}: TacticalUnifiedPageProps = {}) {
  return (
    <TacticalUnifiedStoreProvider initialState={initialState}>
      <TacticalUnifiedPageContent
        initialMatchId={initialMatchId}
        initialMinute={initialMinute}
        initialState={initialState}
      />
    </TacticalUnifiedStoreProvider>
  );
}

interface TacticalUnifiedPageContentProps {
  initialMatchId?: string;
  initialMinute?: number;
  initialState?: Partial<TacticalUnifiedState>;
}

function TacticalUnifiedPageContent({
  initialMatchId,
  initialState,
}: TacticalUnifiedPageContentProps) {
  // 💾 プロジェクト自動保存 & リロード時自動復元 (Dexie IndexedDB)
  useTacticalAutoSave({
    matchId: initialMatchId,
    skipRestore: Boolean(initialState?.project),
  });

  const exportModalOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.exportModalOpen,
  );
  const projectManagerModalOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.projectManagerModalOpen,
  );
  const closeProjectManagerModal = useTacticalUnifiedStoreContext(
    (s) => s.closeProjectManagerModal,
  );
  const sidebarOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.sidebarOpen,
  );
  const splitPreviewOpen = useTacticalUnifiedStoreContext((s) =>
    Boolean(s.panels.splitPreviewOpen),
  );

  const [isFocusMode, setIsFocusMode] = useState(false);

  // Focus Mode toggle via shortcut '\'
  useTacticalShortcuts({
    toggleFocusMode: () => setIsFocusMode((prev) => !prev),
  });

  // キーボードショートカット (Delete/Escape)
  useKeyboardShortcuts();

  // 📋 クリップボード画像貼り付け & 📂 ファイルドラッグ＆ドロップ対応
  const { handleDragOver, handleDrop } = useTacticalDropPaste();

  const canvasRef = useRef<CanvasCoreHandle | null>(null);

  const movePlayerToPitch = useTacticalUnifiedStoreContext(
    (s) => s.movePlayerToPitch,
  );
  const movePlayerToBench = useTacticalUnifiedStoreContext(
    (s) => s.movePlayerToBench,
  );
  const phases = useTacticalUnifiedStoreContext((s) => s.project.phases);
  const activePhaseId = useTacticalUnifiedStoreContext((s) => s.activePhaseId);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance,
  );
  const selectPhaseAndSlide = useTacticalUnifiedStoreContext(
    (s) => s.selectPhaseAndSlide,
  );
  const addPhase = useTacticalUnifiedStoreContext((s) => s.addPhase);
  const deletePhase = useTacticalUnifiedStoreContext((s) => s.deletePhase);
  const renamePhase = useTacticalUnifiedStoreContext((s) => s.renamePhase);
  const setActivePhase = useTacticalUnifiedStoreContext(
    (s) => s.setActivePhase,
  );
  const addSlide = useTacticalUnifiedStoreContext((s) => s.addSlide);

  const handleDndEnd = (event: DragEndEvent) => {
    handleTacticalDndEnd(event, {
      activeSlideId,
      movePlayerToPitch,
      movePlayerToBench,
    });
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
              phases={phases}
              activePhaseId={activePhaseId}
              activeSlideId={activeSlideId}
              pitchAppearance={pitchAppearance}
              onSelectScene={selectPhaseAndSlide}
              onAddPhase={() => addPhase()}
              onDeletePhase={deletePhase}
              onRenamePhase={renamePhase}
              onAddSlideToPhase={(phaseId) => {
                if (phaseId !== activePhaseId) {
                  setActivePhase(phaseId);
                }
                addSlide(undefined, 'full');
              }}
            />
          )}

          {/* Central Workspace: Canvas + Split Preview */}
          <div className="flex-1 min-w-0 relative overflow-hidden flex flex-row bg-[#0D0D0E]">
            <main className="flex-1 min-w-0 relative overflow-hidden flex flex-col bg-[#0D0D0E]">
              <FullTacticalCanvas ref={canvasRef} />
            </main>
            {!isFocusMode && splitPreviewOpen && (
              <div className="w-1/2 min-w-[320px] max-w-[55%] border-l border-white/20 flex flex-col h-full">
                <TacticalSplitPreviewPanel />
              </div>
            )}
          </div>

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
