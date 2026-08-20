'use client';

import { DndContext, DragOverlay, type DragStartEvent } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TacticalAnimationModal } from '@/components/features/tactical-animation/tactical-animation-modal';
import {
  CHELSEA_TACTICS_MATCH_ID,
  useChelseaSquad,
} from '@/hooks/use-chelsea-squad';
import { useTacticalBoard } from '@/hooks/use-tactical-board';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import {
  generateInitialMapping,
  getShirtNo,
  parsePlayerIdFromMarkerId,
} from '@/lib/data/tactical-utils';
import {
  AVAILABLE_SEASONS,
  DEFAULT_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';
import { useTacticalStore } from '@/stores/tactical-store';
import type { Player } from '@/types';
import { BenchArea } from './bench-area';
import type { TacticalDrawTool } from './drawing/tactical-drawing-canvas';
import { useTacticalExport } from './hooks/use-tactical-export';
import { PlayerMarker } from './player-marker';
import { TacticalHeader } from './tactical-header';
import { TacticalPitchArea } from './tactical-pitch-area';

interface ChelseaTacticalBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChelseaTacticalBoardModal: React.FC<
  ChelseaTacticalBoardModalProps
> = ({ isOpen, onClose }) => {
  const [selectedSeason, setSelectedSeason] = useState<Season>(DEFAULT_SEASON);
  const { virtualMatch } = useChelseaSquad(selectedSeason);
  const matchId = CHELSEA_TACTICS_MATCH_ID;

  const savedSettings = useTacticalStore((s) => s.savedSettings);
  const ballPos = useTacticalStore((s) => s.ballPos);
  const isFlipped = useTacticalStore((s) => s.isFlipped);
  const activeId = useTacticalStore((s) => s.activeId);
  const benchTeam = useTacticalStore((s) => s.benchTeam);
  const setBenchTeam = useTacticalStore((s) => s.setBenchTeam);
  const homeColor = useTacticalStore((s) => s.homeColor);
  const awayColor = useTacticalStore((s) => s.awayColor);
  const updatePlayer = useTacticalStore((s) => s.updatePlayer);
  const setSavedSettings = useTacticalStore((s) => s.setSavedSettings);

  const importFromTacticalBoard = useTacticalAnimationStore(
    (s) => s.importFromTacticalBoard,
  );

  const [formationMode, setFormationMode] = useState<FormationMode>('half');
  const [activeDrawTool, setActiveDrawTool] =
    useState<TacticalDrawTool>('select');
  const [isAnimationOpen, setIsAnimationOpen] = useState(false);

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
  } = useTacticalBoard(matchId, virtualMatch, isOpen);

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

  const orientation = useTacticalStore((s) => s.orientation);

  // アニメーション作成モーダルへ移行
  const handleOpenAnimation = useCallback(() => {
    importFromTacticalBoard(
      savedSettings,
      ballPos,
      virtualMatch,
      isFlipped,
      orientation,
    );
    setIsAnimationOpen(true);
  }, [
    importFromTacticalBoard,
    savedSettings,
    ballPos,
    virtualMatch,
    isFlipped,
    orientation,
  ]);

  const handleSeasonChange = useCallback((newSeason: Season) => {
    setSelectedSeason(newSeason);
  }, []);

  // virtualMatch更新時（シーズン切り替えなど）に、配置に含まれていない新選手をベンチに自動配置
  useEffect(() => {
    if (!virtualMatch || Object.keys(savedSettings).length === 0) return;
    const currentKeys = new Set(Object.keys(savedSettings).map(Number));
    let hasChanges = false;
    const updated = { ...savedSettings };

    const homePlayers = (virtualMatch.teams.home?.players || []) as Player[];
    const awayPlayers = (virtualMatch.teams.away?.players || []) as Player[];

    [...homePlayers, ...awayPlayers].forEach((p) => {
      if (!currentKeys.has(p.playerId)) {
        hasChanges = true;
        const currentBenchCount = Object.values(updated).filter(
          (item) => item.area === 'bench' && item.team === (p.field || 'home'),
        ).length;
        const pos = {
          x: 10 + (currentBenchCount % 4) * 25,
          y: 10 + Math.floor(currentBenchCount / 4) * 20,
        };
        updated[p.playerId] = {
          playerId: p.playerId,
          shirtNo: String(p.shirtNo || 99),
          x: pos.x,
          y: pos.y,
          team: (p.field as 'home' | 'away') || 'home',
          area: 'bench',
        };
      }
    });

    if (hasChanges) {
      setSavedSettings(updated);
    }
  }, [virtualMatch, savedSettings, setSavedSettings]);

  const benchPlayers = useMemo(
    () =>
      Object.values(savedSettings).filter(
        (p) => p.area === 'bench' && p.team === benchTeam,
      ),
    [savedSettings, benchTeam],
  );

  const activePlayerData = useMemo(() => {
    if (!activeId || activeId === 'ball') return null;
    const pId = parsePlayerIdFromMarkerId(activeId);
    if (pId === null) return null;
    const p = savedSettings[pId];
    if (!p) return null;

    const playerMeta = virtualMatch?.teams[p.team]?.players?.find(
      (pm) => pm.playerId === pId,
    );
    return { p, playerMeta, pId };
  }, [activeId, savedSettings, virtualMatch]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md overflow-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[snapCenterToCursor]}
        >
          <div className="relative w-[98vw] h-[98vh] flex flex-col bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden rounded-2xl">
            <TacticalHeader
              metadata={virtualMatch}
              onClose={onClose}
              onReset={handleReset}
              activeDrawTool={activeDrawTool}
              onSelectDrawTool={setActiveDrawTool}
              onExportScreenshot={handleExportScreenshot}
              onClearDrawing={handleClearDrawing}
              onOpenAnimation={handleOpenAnimation}
              isExporting={isExporting}
            />

            {/* Main Board Canvas */}
            <div className="flex-1 flex flex-row gap-4 p-4 bg-slate-950/20 overflow-hidden relative">
              <TacticalPitchArea
                matchId={matchId}
                metadata={virtualMatch}
                activeDrawTool={activeDrawTool}
                onMarkerTouch={handleMarkerTouch}
                onSelectDrawTool={setActiveDrawTool}
                onClearRef={(clearFn: () => void) => {
                  clearFnRef.current = clearFn;
                }}
                pitchRef={pitchRef}
              />

              {/* Bench Area (Right 25%) */}
              <div className="flex-[1] min-w-0 h-full flex flex-col min-h-0">
                <BenchArea
                  teamName={virtualMatch.teams[benchTeam].name}
                  onTeamToggle={() =>
                    setBenchTeam(benchTeam === 'home' ? 'away' : 'home')
                  }
                  onAlignGrid={handleAlignBench}
                  formationMode={formationMode}
                  onFormationModeChange={setFormationMode}
                  onFormationChange={(type: FormationType) =>
                    handleApplyFormation(benchTeam, type, formationMode)
                  }
                  season={selectedSeason}
                  onSeasonChange={(s) => handleSeasonChange(s as Season)}
                  availableSeasons={AVAILABLE_SEASONS}
                >
                  {benchPlayers.map((p) => {
                    const playerMeta = virtualMatch.teams[p.team].players.find(
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

      {/* 戦術アニメーションモーダル */}
      {isAnimationOpen && (
        <TacticalAnimationModal
          isOpen={isAnimationOpen}
          onClose={() => setIsAnimationOpen(false)}
          metadata={virtualMatch}
          matchId={matchId}
          skipAutoImport={true}
        />
      )}
    </>,
    document.body,
  );
};
