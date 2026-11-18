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
import { useCallback, useRef, useState } from 'react';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { handleTacticalDndEnd } from '@/features/tactical-unified/core/utils/dnd-coordinates';
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import { useTacticalAutoSave } from '@/features/tactical-unified/hooks/use-tactical-auto-save';
import { useTacticalDropPaste } from '@/features/tactical-unified/hooks/use-tactical-drop-paste';
import type { TacticalMatchInitialState } from '@/features/tactical-unified/hooks/use-tactical-match-init';
import { useTacticalShortcuts } from '@/features/tactical-unified/hooks/use-tactical-shortcuts';
import type { CreateSessionStoreOptions } from '@/features/tactical-unified/stores/session-store';
import {
  TacticalStoreProvider,
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import { TacticalPlayerPhotoProvider } from './objects/player/components/tactical-player-photo-provider';
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
  initialState?: TacticalMatchInitialState;
  initialSession?: CreateSessionStoreOptions;
}

export function TacticalUnifiedPage({
  initialMatchId,
  initialMinute,
  initialState,
  initialSession,
}: TacticalUnifiedPageProps = {}) {
  const mergedInitialSession: CreateSessionStoreOptions | undefined =
    initialState || initialSession
      ? {
          ...initialSession,
          ...(initialState?.activePhaseId
            ? { activePhaseId: initialState.activePhaseId }
            : {}),
          ...(initialState?.activeSlideId
            ? { activeSlideId: initialState.activeSlideId }
            : {}),
        }
      : undefined;

  return (
    <TacticalStoreProvider
      initialProject={initialState?.project}
      initialSession={mergedInitialSession}
    >
      <TacticalPlayerPhotoProvider>
        <TacticalUnifiedPageContent
          initialMatchId={initialMatchId}
          initialMinute={initialMinute}
          initialState={initialState}
        />
      </TacticalPlayerPhotoProvider>
    </TacticalStoreProvider>
  );
}

interface TacticalUnifiedPageContentProps {
  initialMatchId?: string;
  initialMinute?: number;
  initialState?: TacticalMatchInitialState;
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

  const exportModalOpen = useSessionStore((s) => s.panels.exportModalOpen);
  const projectManagerModalOpen = useSessionStore(
    (s) => s.panels.projectManagerModalOpen,
  );
  const closeProjectManagerModal = useSessionStore(
    (s) => s.closeProjectManagerModal,
  );
  const sidebarOpen = useSessionStore((s) => s.panels.sidebarOpen);
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const isDirectorMode = workspaceMode === 'director';

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

  const phases = useDocumentStore((s) => s.project.phases);
  const pitchAppearance = useDocumentStore((s) => s.project.pitchAppearance);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActivePhaseId = useSessionStore((s) => s.setActivePhaseId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);

  const handleDndEnd = (event: DragEndEvent) => {
    handleTacticalDndEnd(event, {
      activeSlideId,
      movePlayerToPitch: (slideId, playerId, x, y) => {
        dispatchSlide(activePhaseId, slideId, {
          type: 'MOVE_PLAYER_TO_PITCH',
          id: playerId,
          x: clampToScreenNorm(x),
          y: clampToScreenNorm(y),
        });
      },
      movePlayerToBench: (slideId, playerId) => {
        dispatchSlide(activePhaseId, slideId, {
          type: 'MOVE_PLAYER_TO_BENCH',
          id: playerId,
        });
      },
    });
  };

  const handleToggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);

  const handleSelectScene = useCallback(
    (phaseId: string, slideId: string) => {
      setActivePhaseId(phaseId);
      setActiveSlideId(slideId);
    },
    [setActivePhaseId, setActiveSlideId],
  );

  const handleAddPhase = useCallback(() => {
    const newPhaseId = crypto.randomUUID();
    const newSlideId = crypto.randomUUID();
    dispatch({
      type: 'ADD_PHASE',
      name: `Phase ${phases.length + 1}`,
      newPhaseId,
      newSlideId,
    });
    setActivePhaseId(newPhaseId);
    setActiveSlideId(newSlideId);
  }, [dispatch, phases.length, setActivePhaseId, setActiveSlideId]);

  const handleDeletePhase = useCallback(
    (phaseId: string) => {
      const remaining = phases.filter((p) => p.id !== phaseId);
      dispatch({ type: 'DELETE_PHASE', phaseId });
      if (phaseId === activePhaseId && remaining.length > 0) {
        const fallback = remaining[0];
        setActivePhaseId(fallback.id);
        setActiveSlideId(fallback.slides[0]?.id ?? '');
      }
    },
    [activePhaseId, dispatch, phases, setActivePhaseId, setActiveSlideId],
  );

  const handleRenamePhase = useCallback(
    (phaseId: string, name: string) => {
      dispatch({
        type: 'UPDATE_PHASE',
        phaseId,
        patch: { name },
      });
    },
    [dispatch],
  );

  const handleAddSlideToPhase = useCallback(
    (phaseId: string) => {
      const newSlideId = crypto.randomUUID();
      dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        mode: 'full',
        newSlideId,
      });
      setActivePhaseId(phaseId);
      setActiveSlideId(newSlideId);
    },
    [dispatch, setActivePhaseId, setActiveSlideId],
  );

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
          onToggleFocusMode={handleToggleFocusMode}
        />

        {/* Main Area (3-Pane Workspace or Director View) */}
        <div className="flex flex-1 min-h-0 relative">
          {/* Left Panel (Tactical Sequences / Toggleable) */}
          {!isFocusMode && sidebarOpen && (
            <LeftPanel
              phases={phases}
              activePhaseId={activePhaseId}
              activeSlideId={activeSlideId}
              pitchAppearance={pitchAppearance}
              onSelectScene={handleSelectScene}
              onAddPhase={handleAddPhase}
              onDeletePhase={handleDeletePhase}
              onRenamePhase={handleRenamePhase}
              onAddSlideToPhase={handleAddSlideToPhase}
            />
          )}

          {/* Central Workspace: Canvas (board) or Director View (director) */}
          <div className="flex-1 min-w-0 relative overflow-hidden flex flex-row bg-[#0D0D0E]">
            {isDirectorMode ? (
              <div className="flex-1 min-w-0 h-full">
                <TacticalSplitPreviewPanel />
              </div>
            ) : (
              <main className="flex-1 min-w-0 relative overflow-hidden flex flex-col bg-[#0D0D0E]">
                <FullTacticalCanvas ref={canvasRef} />
              </main>
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
