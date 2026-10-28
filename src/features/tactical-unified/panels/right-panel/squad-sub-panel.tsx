'use client';

/**
 * squad-sub-panel.tsx
 * Dedicated Right Panel: Squad & Substitutes (Bench) Management
 */

import type { KonvaEventObject } from 'konva/lib/Node';
import { Sparkles, UserPlus, Users } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  computeBenchGridPositions,
  type Player,
} from '@/lib/types/tactical-unified';
import { FormationCustomManager } from './formation-custom-manager';
import {
  BASE_BENCH_HEIGHT,
  SquadBenchCanvas,
  type SquadBenchCanvasProps,
} from './squad-bench-canvas';
import { SquadSubForm, type SquadSubFormProps } from './squad-sub-form';
import {
  SquadTeamSwitcher,
  type SquadTeamSwitcherProps,
} from './squad-team-switcher';

export {
  BASE_BENCH_HEIGHT,
  SquadBenchCanvas,
  type SquadBenchCanvasProps,
  SquadSubForm,
  type SquadSubFormProps,
  SquadTeamSwitcher,
  type SquadTeamSwitcherProps,
};

export function SquadSubPanel() {
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const project = useTacticalUnifiedStore((s) => s.project);
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const addCustomPlayer = useTacticalUnifiedStore((s) => s.addCustomPlayer);

  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubNo, setNewSubNo] = useState('');
  const [newSubPos, setNewSubPos] = useState('SUB');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(360);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setCanvasWidth(w);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const teamPlayers = useMemo(() => {
    if (!activeSlide) return { pitch: [], bench: [] };
    const pitch = activeSlide.players.filter(
      (p) => p.team === activeTeam && p.area === 'pitch',
    );
    const bench = activeSlide.players.filter(
      (p) => p.team === activeTeam && p.area === 'bench',
    );
    return { pitch, bench };
  }, [activeSlide, activeTeam]);

  const selectedIds = useMemo(
    () => selectedObjects.map((o) => o.id),
    [selectedObjects],
  );

  const maxBenchY = useMemo(() => {
    if (teamPlayers.bench.length === 0) return 80;
    return teamPlayers.bench.reduce((max, p) => Math.max(max, p.y), 80);
  }, [teamPlayers.bench]);

  const stageHeight = Math.max(
    BASE_BENCH_HEIGHT,
    Math.ceil(((maxBenchY + 15) / 100) * BASE_BENCH_HEIGHT),
  );

  const handleOrganizeBench = () => {
    if (!activeSlide || teamPlayers.bench.length === 0) return;
    const positionedBench = computeBenchGridPositions(teamPlayers.bench);
    const benchMap = new Map(positionedBench.map((p) => [p.id, p]));

    useTacticalUnifiedStore.setState((s) => ({
      ...s,
      project: {
        ...s.project,
        slides: s.project.slides.map((sl) =>
          sl.id === activeSlideId
            ? {
                ...sl,
                players: sl.players.map((p) => benchMap.get(p.id) ?? p),
              }
            : sl,
        ),
      },
      isDirty: true,
    }));
  };

  const handleDragStart = useCallback(
    (_e: KonvaEventObject<DragEvent>, markerId: string) => {
      if (!selectedIds.includes(markerId)) {
        selectObject({ id: markerId, kind: 'player' }, false);
      }
    },
    [selectedIds, selectObject],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: Player) => {
      const clientX = (e.evt as MouseEvent | undefined)?.clientX;
      const clientY = (e.evt as MouseEvent | undefined)?.clientY;

      const benchEl =
        typeof document !== 'undefined'
          ? document.getElementById('tactical-bench-canvas')
          : null;
      const benchRect = benchEl?.getBoundingClientRect();
      const panelLeft =
        benchRect?.left ??
        (typeof window !== 'undefined' ? window.innerWidth - 400 : 0);

      // 右パネルの左境界より左側（メインキャンバス上）にドロップされた場合
      if (clientX !== undefined && clientX < panelLeft) {
        const pitchDroppable =
          typeof document !== 'undefined'
            ? document.getElementById('tactical-pitch-droppable')
            : null;
        if (pitchDroppable && clientY !== undefined) {
          const pRect = pitchDroppable.getBoundingClientRect();
          const pitchX = Math.max(
            0,
            Math.min(100, ((clientX - pRect.left) / pRect.width) * 100),
          );
          const pitchY = Math.max(
            0,
            Math.min(100, ((clientY - pRect.top) / pRect.height) * 100),
          );
          movePlayerToPitch(activeSlideId, marker.id, pitchX, pitchY);
        } else {
          movePlayerToPitch(activeSlideId, marker.id);
        }
        return;
      }

      // サブキャンバス内での自由ドラッグ配置
      const targetNode = e.target;
      const newX = Math.max(
        0,
        Math.min(100, (targetNode.x() / canvasWidth) * 100),
      );
      const newY = Math.max(0, (targetNode.y() / BASE_BENCH_HEIGHT) * 100);
      updatePlayer(activeSlideId, marker.id, { x: newX, y: newY });
    },
    [activeSlideId, canvasWidth, movePlayerToPitch, updatePlayer],
  );

  const handleClick = useCallback(
    (markerId: string, isShift: boolean) => {
      selectObject({ id: markerId, kind: 'player' }, isShift);
    },
    [selectObject],
  );

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() && !newSubNo.trim()) return;
    addCustomPlayer(
      activeSlideId,
      activeTeam,
      newSubName.trim() || undefined,
      newSubNo.trim() || undefined,
      newSubPos.trim() || undefined,
      'bench',
    );
    setNewSubName('');
    setNewSubNo('');
    setIsAddingSub(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#121214] text-white text-xs select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] shrink-0 bg-[#18181B]">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[#FFA336]" />
          <span className="font-semibold text-white/90">Squad & Bench</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingSub((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
            isAddingSub
              ? 'bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_14px_rgba(255,129,0,0.5)]'
              : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-transparent'
          }`}
        >
          <UserPlus size={11} />
          <span>Add Player</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Team Switcher */}
        <SquadTeamSwitcher
          activeTeam={activeTeam}
          setActiveTeam={setActiveTeam}
          homeColor={project.homeColor.primary}
          awayColor={project.awayColor.primary}
          homeSubCount={teamPlayers.bench.length}
          awaySubCount={teamPlayers.bench.length}
        />

        {/* 2. Substitutes / Bench Area (Konva Stage + PlayerMarkerItem サブキャンバス) */}
        <div className="p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              Substitutes ({teamPlayers.bench.length})
            </span>
            <button
              type="button"
              onClick={handleOrganizeBench}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-medium transition-colors cursor-pointer border border-white/[0.08] shadow-xs"
              title="ポジション順（FW/MF/DF/GK）に3列再整列"
            >
              <Sparkles size={11} className="text-amber-400" />
              <span>整理</span>
            </button>
          </div>

          {/* New Sub Player Form */}
          {isAddingSub && (
            <SquadSubForm
              newSubNo={newSubNo}
              setNewSubNo={setNewSubNo}
              newSubPos={newSubPos}
              setNewSubPos={setNewSubPos}
              newSubName={newSubName}
              setNewSubName={setNewSubName}
              onSubmit={handleAddSub}
            />
          )}

          {/* Sub-canvas Area (Konva Stage) */}
          <SquadBenchCanvas
            benchPlayers={teamPlayers.bench}
            selectedIds={selectedIds}
            containerRef={containerRef}
            canvasWidth={canvasWidth}
            stageHeight={stageHeight}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
          />
        </div>

        {/* 3. Club & Season Presets (Only displayed for normal boards without matchId) */}
        {!project.matchId && (
          <FormationCustomManager
            activeTeam={activeTeam}
            activeSlideId={activeSlideId}
            formationMode="full"
          />
        )}
      </div>
    </div>
  );
}
