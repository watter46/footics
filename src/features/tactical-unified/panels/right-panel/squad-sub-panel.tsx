'use client';

/**
 * squad-sub-panel.tsx
 * Dedicated Right Panel: Squad & Substitutes (Bench) Management
 */

import type { KonvaEventObject } from 'konva/lib/Node';
import { Sparkles, UserPlus, Users } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Stage } from 'react-konva';
import { PlayerMarkerItem } from '@/features/tactical-unified/core/components/PlayerMarkerItem';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  computeBenchGridPositions,
  type Player,
} from '@/lib/types/tactical-unified';
import { FormationCustomManager } from './formation-custom-manager';

const BASE_BENCH_HEIGHT = 280;

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
    <div className="flex flex-col h-full bg-[#141414] text-white text-xs select-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 bg-[#181818]">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          <span className="font-semibold text-white/90">Squad & Bench</span>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingSub((v) => !v)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
            isAddingSub
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
          }`}
        >
          <UserPlus size={11} />
          <span>Add Player</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Team Switcher */}
        <div className="p-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTeam('home')}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                activeTeam === 'home'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full border border-white/30 shrink-0"
                style={{ backgroundColor: project.homeColor.primary }}
              />
              <span>HOME</span>
              <span className="text-[10px] opacity-70">
                ({teamPlayers.bench.length} Sub)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTeam('away')}
              className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                activeTeam === 'away'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full border border-white/30 shrink-0"
                style={{ backgroundColor: project.awayColor.primary }}
              />
              <span>AWAY</span>
              <span className="text-[10px] opacity-70">
                ({teamPlayers.bench.length} Sub)
              </span>
            </button>
          </div>
        </div>

        {/* 2. Substitutes / Bench Area (Konva Stage + PlayerMarkerItem サブキャンバス) */}
        <div className="p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
              Substitutes ({teamPlayers.bench.length})
            </span>
            <button
              type="button"
              onClick={handleOrganizeBench}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[10px] font-medium transition-colors cursor-pointer border border-white/10 shadow-xs"
              title="ポジション順（FW/MF/DF/GK）に3列再整列"
            >
              <Sparkles size={11} className="text-amber-400" />
              <span>整理</span>
            </button>
          </div>

          {/* New Sub Player Form */}
          {isAddingSub && (
            <form
              onSubmit={handleAddSub}
              className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2"
            >
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text"
                  placeholder="No."
                  value={newSubNo}
                  onChange={(e) => setNewSubNo(e.target.value)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                />
                <input
                  type="text"
                  placeholder="Pos"
                  value={newSubPos}
                  onChange={(e) => setNewSubPos(e.target.value)}
                  className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                >
                  Add
                </button>
              </div>
              <input
                type="text"
                placeholder="Player Name"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
              />
            </form>
          )}

          {/* Sub-canvas Area (Konva Stage) */}
          <div className="min-h-[160px] max-h-[360px] overflow-y-auto custom-scrollbar rounded-xl border border-white/10 bg-black/40">
            {teamPlayers.bench.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-lg text-white/30 text-xs m-2">
                <span>ベンチ選手がいません</span>
                <span className="text-[10px] opacity-60 mt-1">
                  ピッチからドラッグして退避
                </span>
              </div>
            ) : (
              <div
                id="tactical-bench-canvas"
                ref={containerRef}
                className="w-full relative"
                style={{ minHeight: BASE_BENCH_HEIGHT, height: stageHeight }}
              >
                <Stage
                  width={canvasWidth}
                  height={stageHeight}
                  listening={true}
                >
                  <Layer>
                    {teamPlayers.bench.map((player) => (
                      <PlayerMarkerItem
                        key={player.id}
                        marker={player}
                        width={canvasWidth}
                        height={BASE_BENCH_HEIGHT}
                        baseDim={canvasWidth}
                        markerMode="2d-only"
                        isSelected={selectedIds.includes(player.id)}
                        isInteractive={true}
                        connectingPlayerId={null}
                        onDragStart={handleDragStart}
                        onDragMove={() => {}}
                        onDragEnd={handleDragEnd}
                        onClick={handleClick}
                        onUpdateVisionCone={() => {}}
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
            )}
          </div>
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
