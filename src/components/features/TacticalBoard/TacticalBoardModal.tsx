'use client';

import { DndContext, DragOverlay, type DragStartEvent } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useKeyboardShortcut } from '@/hooks/use-shortcut';
import { useTacticalBoard } from '@/hooks/use-tactical-board';
import { useTacticalStore } from '@/hooks/use-tactical-store';
import type { FormationMode } from '@/lib/data/formations';
import { getShirtNo } from '@/lib/data/tactical-utils';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import type { Match } from '@/types';
import { BenchArea } from './BenchArea';
import type { TacticalDrawTool } from './components/TacticalDrawingCanvas';
import { useTacticalExport } from './hooks/use-tactical-export';
import { PlayerMarker } from './PlayerMarker';
import { TacticalHeader } from './TacticalHeader';
import { TacticalPitchArea } from './TacticalPitchArea';

interface TacticalBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  metadata: Match;
}

export const TacticalBoardModal: React.FC<TacticalBoardModalProps> = ({
  isOpen,
  onClose,
  matchId,
  metadata,
}) => {
  const {
    savedSettings,
    activeId,
    benchTeam,
    setBenchTeam,
    homeColor,
    awayColor,
  } = useTacticalStore();

  const [formationMode, setFormationMode] = useState<FormationMode>('half');
  const [activeDrawTool, setActiveDrawTool] =
    useState<TacticalDrawTool>('select');

  const pitchRef = useRef<HTMLDivElement>(null);
  const clearFnRef = useRef<(() => void) | null>(null);

  const { exportPitchImage, isExporting } = useTacticalExport();

  const {
    sensors,
    handleDragStart: originalHandleDragStart,
    handleDragEnd,
    handleAlignBench,
    handleReset,
    handleApplyFormation,
  } = useTacticalBoard(matchId, metadata, isOpen);

  // マーカー操作が開始されたら自動的にコマ操作モードに切り替え
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveDrawTool('select');
      originalHandleDragStart(event);
    },
    [originalHandleDragStart],
  );

  const handleMarkerTouch = useCallback(() => {
    setActiveDrawTool('select');
  }, []);

  const handleClearDrawing = useCallback(() => {
    if (clearFnRef.current) {
      clearFnRef.current();
    }
  }, []);

  const handleExportScreenshot = useCallback(() => {
    exportPitchImage(pitchRef.current, matchId);
  }, [exportPitchImage, matchId]);

  // Close on Escape
  useKeyboardShortcut(SHORTCUT_ACTIONS.CLOSE_MODAL, onClose, {
    enabled: isOpen,
    ignoreInput: false,
  });

  const benchPlayers = useMemo(
    () =>
      Object.values(savedSettings).filter(
        (p) => p.area === 'bench' && p.team === benchTeam,
      ),
    [savedSettings, benchTeam],
  );

  const activePlayerData = useMemo(() => {
    if (!activeId || activeId === 'ball') return null;
    const [_, pIdStr] = activeId.split('-');
    const pId = parseInt(pIdStr, 10);
    const p = savedSettings[pId];
    if (!p) return null;

    const playerMeta = metadata?.teams[p.team]?.players?.find(
      (pm) => pm.playerId === pId,
    );
    return { p, playerMeta, pId };
  }, [activeId, savedSettings, metadata]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md overflow-hidden">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[snapCenterToCursor]}
      >
        <div className="relative w-[98vw] h-[98vh] flex flex-col bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
          <TacticalHeader
            metadata={metadata}
            onClose={onClose}
            onReset={handleReset}
            activeDrawTool={activeDrawTool}
            onSelectDrawTool={setActiveDrawTool}
            onExportScreenshot={handleExportScreenshot}
            onClearDrawing={handleClearDrawing}
            isExporting={isExporting}
          />

          {/* Main Board Canvas */}
          <div className="flex-1 flex flex-row gap-4 p-4 bg-slate-950/20 overflow-hidden relative">
            <TacticalPitchArea
              matchId={matchId}
              metadata={metadata}
              activeDrawTool={activeDrawTool}
              onMarkerTouch={handleMarkerTouch}
              onClearRef={(clearFn) => {
                clearFnRef.current = clearFn;
              }}
              pitchRef={pitchRef}
            />

            {/* Bench Area (Right 25%) */}
            <div className="flex-[1] min-w-0 h-full flex flex-col min-h-0">
              <BenchArea
                teamName={metadata.teams[benchTeam].name}
                onTeamToggle={() =>
                  setBenchTeam(benchTeam === 'home' ? 'away' : 'home')
                }
                onAlignGrid={handleAlignBench}
                formationMode={formationMode}
                onFormationModeChange={setFormationMode}
                onFormationChange={(type) =>
                  handleApplyFormation(benchTeam, type, formationMode)
                }
              >
                {benchPlayers.map((p) => {
                  const playerMeta = metadata.teams[p.team].players.find(
                    (pm) => pm.playerId === p.playerId,
                  );
                  return (
                    <PlayerMarker
                      key={p.playerId}
                      id={`${matchId}-${p.playerId}`}
                      playerName={playerMeta?.name || `Player ${p.playerId}`}
                      shirtNo={getShirtNo(p) || getShirtNo(playerMeta)}
                      initialX={p.x}
                      initialY={p.y}
                      color={p.team === 'home' ? homeColor : awayColor}
                      onMarkerTouch={handleMarkerTouch}
                    />
                  );
                })}
              </BenchArea>
            </div>
          </div>

          <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
            {activeId === 'ball' && (
              <PlayerMarker
                id="ball"
                playerName="BALL"
                initialX={0}
                initialY={0}
                color="#f97316"
                isBall
                isOverlay
              />
            )}
            {activePlayerData && activeId && (
              <PlayerMarker
                id={activeId}
                playerName={
                  activePlayerData.playerMeta?.name ||
                  `Player ${activePlayerData.pId}`
                }
                shirtNo={
                  getShirtNo(activePlayerData.p) ||
                  getShirtNo(activePlayerData.playerMeta)
                }
                initialX={0}
                initialY={0}
                color={
                  activePlayerData.p.team === 'home' ? homeColor : awayColor
                }
                isOverlay
              />
            )}
          </DragOverlay>
        </div>
      </DndContext>
    </div>
  );
};
