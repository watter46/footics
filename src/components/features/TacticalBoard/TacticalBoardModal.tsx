'use client';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import type React from 'react';
import { useState } from 'react';
import { useKeyboardShortcut } from '@/hooks/use-shortcut';
import { useTacticalBoard } from '@/hooks/use-tactical-board';
import { useTacticalStore } from '@/hooks/use-tactical-store';
import type { FormationMode } from '@/lib/data/formations';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import { BenchArea } from './BenchArea';
import { PlayerMarker } from './PlayerMarker';
import { TacticalHeader } from './TacticalHeader';
import { TacticalPitchArea } from './TacticalPitchArea';

interface TacticalBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  metadata: any;
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

  const [formationMode, setFormationMode] = useState<FormationMode>('full');

  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    handleAlignBench,
    handleReset,
    handleApplyFormation,
  } = useTacticalBoard(matchId, metadata, isOpen);

  // Close on Escape
  useKeyboardShortcut(SHORTCUT_ACTIONS.CLOSE_MODAL, onClose, {
    enabled: isOpen,
    ignoreInput: false,
  });

  if (!isOpen) return null;

  const benchPlayers = Object.values(savedSettings).filter(
    (p) => p.area === 'bench' && p.team === benchTeam,
  );

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
          />

          {/* Main Board Canvas */}
          <div className="flex-1 flex flex-row gap-4 p-4 bg-slate-950/20 overflow-hidden relative">
            <TacticalPitchArea matchId={matchId} metadata={metadata} />

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
                  const playerMeta = metadata?.teams[p.team]?.players?.find(
                    (pm: any) => pm.playerId === p.playerId,
                  );
                  return (
                    <PlayerMarker
                      key={p.playerId}
                      id={`${matchId}-${p.playerId}`}
                      playerName={playerMeta?.name || `Player ${p.playerId}`}
                      initialX={p.x}
                      initialY={p.y}
                      color={p.team === 'home' ? homeColor : awayColor}
                    />
                  );
                })}
              </BenchArea>
            </div>
          </div>

          <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
            {activeId ? (
              activeId === 'ball' ? (
                <PlayerMarker
                  id="ball"
                  playerName="BALL"
                  initialX={0}
                  initialY={0}
                  color="#f97316"
                  isBall
                  isOverlay
                />
              ) : (
                (() => {
                  const [_, pIdStr] = activeId.split('-');
                  const pId = parseInt(pIdStr);
                  const p = savedSettings[pId];
                  const playerMeta = metadata?.teams[
                    p?.team || 'home'
                  ]?.players?.find((pm: any) => pm.playerId === pId);
                  return (
                    <PlayerMarker
                      id={activeId}
                      playerName={playerMeta?.name || `Player ${pId}`}
                      initialX={0}
                      initialY={0}
                      color={p?.team === 'home' ? homeColor : awayColor}
                      isOverlay
                    />
                  );
                })()
              )
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>
    </div>
  );
};
