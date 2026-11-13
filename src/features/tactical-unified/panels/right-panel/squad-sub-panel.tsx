'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { Sparkles, UserPlus, Users } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { createDefaultDomainPlayer } from '@/lib/tactical/domain/formation-placement';
import { computeDomainBenchGridPositions } from '@/lib/tactical/domain/squad-placement';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainPlayer,
} from '@/lib/types/tactical/domain-entities';
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
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedObjects = useSessionStore((s) => s.selectedObjects);
  const selectObject = useSessionStore((s) => s.selectObject);
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );

  const dispatchSlide = useCallback(
    (
      command: Extract<
        Parameters<typeof dispatch>[0],
        { type: 'APPLY_SLIDE_COMMAND' }
      >['command'],
    ) => {
      dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId: activePhaseId,
        slideId: activeSlideId,
        command,
      });
    },
    [activePhaseId, activeSlideId, dispatch],
  );

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
    const update = () => {
      if (el.clientWidth > 0) setCanvasWidth(el.clientWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const teamPlayers = useMemo(() => {
    if (!activeSlide) return { pitch: [], bench: [] };
    return {
      pitch: activeSlide.players.filter(
        (p) => p.team === activeTeam && p.area === 'pitch',
      ),
      bench: activeSlide.players.filter(
        (p) => p.team === activeTeam && p.area === 'bench',
      ),
    };
  }, [activeSlide, activeTeam]);

  const selectedIds = useMemo(
    () => selectedObjects.map((o) => o.id),
    [selectedObjects],
  );
  const maxBenchY = teamPlayers.bench.reduce(
    (max, p) => Math.max(max, p.y),
    80,
  );
  const stageHeight = Math.max(
    BASE_BENCH_HEIGHT,
    Math.ceil(((maxBenchY + 15) / 100) * BASE_BENCH_HEIGHT),
  );

  const handleOrganizeBench = () => {
    if (!activeSlide || teamPlayers.bench.length === 0) return;
    const positioned = computeDomainBenchGridPositions(
      teamPlayers.bench.filter((p): p is BenchPlayer => p.area === 'bench'),
    );
    const benchMap = new Map(positioned.map((p) => [p.id, p]));
    dispatchSlide({
      type: 'REPLACE_PLAYERS',
      players: activeSlide.players.map((p) => benchMap.get(p.id) ?? p),
    });
  };

  const handleDragStart = useCallback(
    (_e: KonvaEventObject<DragEvent>, markerId: string) => {
      if (!selectedIds.includes(markerId))
        selectObject({ id: markerId, kind: 'player' }, false);
    },
    [selectedIds, selectObject],
  );

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>, marker: DomainPlayer) => {
      const evt = e.evt as MouseEvent | undefined;
      const clientX = evt?.clientX;
      const clientY = evt?.clientY;
      const benchEl =
        typeof document !== 'undefined'
          ? document.getElementById('tactical-bench-canvas')
          : null;
      const panelLeft =
        benchEl?.getBoundingClientRect().left ??
        (typeof window !== 'undefined' ? window.innerWidth - 400 : 0);

      if (clientX !== undefined && clientX < panelLeft) {
        const pitchEl =
          typeof document !== 'undefined'
            ? document.getElementById('tactical-pitch-droppable')
            : null;
        let pitchX = 50;
        let pitchY = 50;
        if (pitchEl && clientY !== undefined) {
          const r = pitchEl.getBoundingClientRect();
          pitchX = Math.max(
            0,
            Math.min(100, ((clientX - r.left) / r.width) * 100),
          );
          pitchY = Math.max(
            0,
            Math.min(100, ((clientY - r.top) / r.height) * 100),
          );
        }
        dispatchSlide({
          type: 'MOVE_PLAYER_TO_PITCH',
          id: marker.id,
          x: clampToScreenNorm(pitchX),
          y: clampToScreenNorm(pitchY),
        });
        return;
      }

      const node = e.target;
      const newX = Math.max(0, Math.min(100, (node.x() / canvasWidth) * 100));
      const newY = Math.max(0, (node.y() / BASE_BENCH_HEIGHT) * 100);
      dispatchSlide({
        type: 'UPDATE_PLAYER',
        id: marker.id,
        patch: { x: clampToScreenNorm(newX), y: clampToScreenNorm(newY) },
      });
    },
    [canvasWidth, dispatchSlide],
  );

  const handleClick = useCallback(
    (markerId: string, isShift: boolean) =>
      selectObject({ id: markerId, kind: 'player' }, isShift),
    [selectObject],
  );

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() && !newSubNo.trim()) return;
    const color =
      activeTeam === 'home'
        ? project.homeColor.primary
        : project.awayColor.primary;
    const base = createDefaultDomainPlayer(activeTeam, 20, 14, color, 'bench');
    dispatchSlide({
      type: 'ADD_PLAYER',
      player: {
        ...base,
        ...(newSubName.trim() ? { name: newSubName.trim() } : {}),
        ...(newSubNo.trim() ? { shirtNo: newSubNo.trim() } : {}),
        ...(newSubPos.trim() ? { position: newSubPos.trim() } : {}),
        isCustom: true,
      },
    });
    setNewSubName('');
    setNewSubNo('');
    setIsAddingSub(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#121214] text-white text-xs select-none">
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
        <SquadTeamSwitcher
          activeTeam={activeTeam}
          setActiveTeam={setActiveTeam}
          homeColor={project.homeColor.primary}
          awayColor={project.awayColor.primary}
          homeSubCount={teamPlayers.bench.length}
          awaySubCount={teamPlayers.bench.length}
        />

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
