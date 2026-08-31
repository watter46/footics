'use client';

/**
 * inspector-panel.tsx
 * Right inspector — Selected Object Properties & Slide Settings
 * Handles: Slide Settings (when unselected), Player, Arrow, Zone, Text
 */

import {
  ArrowDownLeft,
  Award,
  Circle,
  Clock,
  Eye,
  Info,
  Layers,
  LayoutGrid,
  Link,
  MoveRight,
  Plus,
  Settings,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type {
  ArrowAnnotation,
  Easing,
  Player,
  Slide,
  TacticalProject,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  type MarkerOptionTab,
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { ColorInput } from '../common-color-input';

function DashedArrowIcon({
  size = 14,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12H22" strokeDasharray="3.5 2.5" />
      <path d="M18 8L22 12L18 16" />
    </svg>
  );
}

export function InspectorPanel() {
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const slides = useTacticalUnifiedStore((s) => s.project.slides);
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const updateArrow = useTacticalUnifiedStore((s) => s.updateArrow);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);
  const removeArrow = useTacticalUnifiedStore((s) => s.removeArrow);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);
  const updateSlideTransition = useTacticalUnifiedStore(
    (s) => s.updateSlideTransition,
  );
  const deleteSlide = useTacticalUnifiedStore((s) => s.deleteSlide);

  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const project = useTacticalUnifiedStore((s) => s.project);
  const setBackgroundType = useTacticalUnifiedStore((s) => s.setBackgroundType);

  const single = selectedObjects.length === 1 ? selectedObjects[0] : null;

  // ── Unselected: Slide Settings ──────────────────────────────────────
  if (!single || !activeSlide) {
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="Slide Settings"
          onClose={() => {
            setRightPanelTab('formation_sub');
          }}
        />
        <SlideSettingsInspector
          project={project}
          activeSlide={activeSlide}
          slidesCount={slides.length}
          setBackgroundType={setBackgroundType}
          updateSlideTransition={updateSlideTransition}
          deleteSlide={deleteSlide}
        />
      </div>
    );
  }

  // ── Player Selected ──────────────────────────────────────────────────
  if (single.kind === 'player') {
    const player = activeSlide.players.find((p) => p.id === single.id);
    if (!player)
      return (
        <InspectorHeader
          title="Player"
          onClose={() => {
            clearSelection();
          }}
        />
      );
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="Player"
          onClose={() => {
            clearSelection();
          }}
          onDeselect={clearSelection}
        />
        <PlayerInspector
          player={player}
          allPlayers={activeSlide.players}
          slideId={activeSlideId}
          updatePlayer={updatePlayer}
          addArrow={addArrow}
          onRemove={() => {
            removePlayer(activeSlideId, player.id);
            clearSelection();
          }}
        />
      </div>
    );
  }

  // ── Arrow Selected ───────────────────────────────────────────────────
  if (single.kind === 'arrow') {
    const arrow = activeSlide.arrows.find((a) => a.id === single.id);
    if (!arrow)
      return (
        <InspectorHeader
          title="Arrow"
          onClose={() => {
            clearSelection();
          }}
        />
      );
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="Arrow & Line"
          onClose={() => {
            clearSelection();
          }}
          onDeselect={clearSelection}
        />
        <ArrowInspector
          arrow={arrow}
          slideId={activeSlideId}
          updateArrow={updateArrow}
          onRemove={() => {
            removeArrow(activeSlideId, arrow.id);
            clearSelection();
          }}
        />
      </div>
    );
  }

  // ── Zone Selected ────────────────────────────────────────────────────
  if (single.kind === 'zone') {
    const zone = activeSlide.zones.find((z) => z.id === single.id);
    if (!zone)
      return (
        <InspectorHeader
          title="Zone"
          onClose={() => {
            clearSelection();
          }}
        />
      );
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="Zone"
          onClose={() => {
            clearSelection();
          }}
          onDeselect={clearSelection}
        />
        <ZoneInspector
          zone={zone}
          slideId={activeSlideId}
          updateZone={updateZone}
          onRemove={() => {
            removeZone(activeSlideId, zone.id);
            clearSelection();
          }}
        />
      </div>
    );
  }

  // ── Text Selected ────────────────────────────────────────────────────
  if (single.kind === 'text') {
    const text = activeSlide.texts.find((t) => t.id === single.id);
    if (!text)
      return (
        <InspectorHeader
          title="Text"
          onClose={() => {
            clearSelection();
          }}
        />
      );
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="Text"
          onClose={() => {
            clearSelection();
          }}
          onDeselect={clearSelection}
        />
        <TextInspector
          text={text}
          slideId={activeSlideId}
          updateText={updateText}
          onRemove={() => {
            removeText(activeSlideId, text.id);
            clearSelection();
          }}
        />
      </div>
    );
  }

  return (
    <InspectorHeader
      onClose={() => {
        clearSelection();
      }}
    />
  );
}

// ── Header ────────────────────────────────────────────────────────────

function InspectorHeader({
  title,
  onClose,
  onDeselect,
}: {
  title?: string;
  onClose: () => void;
  onDeselect?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0 bg-white/[0.02]">
      <span className="text-xs font-medium text-white/70">
        {title ? `Properties — ${title}` : 'Properties'}
      </span>
      <div className="flex items-center gap-1">
        {onDeselect && (
          <button
            type="button"
            onClick={onDeselect}
            className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title="Deselect object"
          >
            Deselect
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          aria-label="Close panel"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Slide Settings Inspector (Unselected State) ───────────────────────

function SlideSettingsInspector({
  project,
  activeSlide,
  slidesCount,
  setBackgroundType,
  updateSlideTransition,
  deleteSlide,
}: {
  project: TacticalProject;
  activeSlide?: Slide;
  slidesCount: number;
  setBackgroundType: (t: TacticalProject['backgroundType']) => void;
  updateSlideTransition: (
    slideId: string,
    params: Partial<Pick<Slide, 'transitionDurationMs' | 'pauseMs' | 'easing'>>,
  ) => void;
  deleteSlide: (slideId: string) => void;
}) {
  const homeCount =
    activeSlide?.players.filter((p) => p.team === 'home').length ?? 0;
  const awayCount =
    activeSlide?.players.filter((p) => p.team === 'away').length ?? 0;
  const arrowCount = activeSlide?.arrows.length ?? 0;
  const zoneCount = activeSlide?.zones.length ?? 0;
  const textCount = activeSlide?.texts.length ?? 0;

  const bgOptions: {
    label: string;
    value: TacticalProject['backgroundType'];
  }[] = [
    { label: 'Pitch', value: 'pitch' },
    { label: 'Image', value: 'image' },
    { label: 'Blank', value: 'blank' },
  ];

  const easingOptions: { label: string; value: Easing }[] = [
    { label: 'Ease In Out', value: 'ease-in-out' },
    { label: 'Ease In', value: 'ease-in' },
    { label: 'Ease Out', value: 'ease-out' },
    { label: 'Linear', value: 'linear' },
  ];

  const durationSec = activeSlide
    ? (activeSlide.transitionDurationMs / 1000).toFixed(1)
    : '1.0';
  const pauseSec = activeSlide
    ? (activeSlide.pauseMs / 1000).toFixed(1)
    : '0.5';

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      {/* 1. Slide Timing & Animation Settings */}
      {activeSlide && (
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-blue-400" />
            Slide Timing & Animation
          </span>

          {/* Duration */}
          <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Duration</span>
              <span className="font-mono text-blue-400 font-bold">
                {durationSec}s
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={5000}
              step={100}
              value={activeSlide.transitionDurationMs}
              onChange={(e) =>
                updateSlideTransition(activeSlide.id, {
                  transitionDurationMs: parseInt(e.target.value, 10),
                })
              }
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/30 font-mono">
              <span>0.2s</span>
              <span>5.0s</span>
            </div>
          </div>

          {/* Pause */}
          <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Pause</span>
              <span className="font-mono text-emerald-400 font-bold">
                {pauseSec}s
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3000}
              step={100}
              value={activeSlide.pauseMs}
              onChange={(e) =>
                updateSlideTransition(activeSlide.id, {
                  pauseMs: parseInt(e.target.value, 10),
                })
              }
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/30 font-mono">
              <span>0.0s</span>
              <span>3.0s</span>
            </div>
          </div>

          {/* Easing */}
          <div className="space-y-1.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/10">
            <span className="text-xs text-white/60 block">Easing</span>
            <div className="grid grid-cols-2 gap-1">
              {easingOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    updateSlideTransition(activeSlide.id, { easing: opt.value })
                  }
                  className={`px-2 py-1.5 rounded text-[11px] font-medium border transition-all text-center ${
                    activeSlide.easing === opt.value
                      ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Pitch Background */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <LayoutGrid size={13} className="text-emerald-400" />
          Pitch Background
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {bgOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBackgroundType(opt.value)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-center truncate ${
                project.backgroundType === opt.value
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Slide Elements Summary */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={13} className="text-purple-400" />
          Slide Elements
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 block">
              Players (H / A)
            </span>
            <span className="font-mono font-bold text-white">
              {homeCount} <span className="text-white/40 font-normal">/</span>{' '}
              {awayCount}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 block">
              Arrows / Zones / Text
            </span>
            <span className="font-mono font-bold text-white">
              {arrowCount} <span className="text-white/40 font-normal">/</span>{' '}
              {zoneCount} <span className="text-white/40 font-normal">/</span>{' '}
              {textCount}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Delete Slide Action */}
      {activeSlide && (
        <div className="pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              if (slidesCount <= 1) return;
              if (
                window.confirm('Are you sure you want to delete this slide?')
              ) {
                deleteSlide(activeSlide.id);
              }
            }}
            disabled={slidesCount <= 1}
            className="w-full py-2 rounded-lg border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Delete Slide</span>
          </button>
          {slidesCount <= 1 && (
            <p className="text-[10px] text-white/30 text-center mt-1">
              At least one slide is required in project.
            </p>
          )}
        </div>
      )}

      {/* 5. Guide / Hints */}
      <div className="pt-3 border-t border-white/10">
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200/80 leading-relaxed flex items-start gap-2">
          <Info size={14} className="shrink-0 text-blue-400 mt-0.5" />
          <span>
            Click on any player, arrow, zone, or text on the pitch to edit its
            detailed properties (Vision Cone, Connectors, Badges, etc.).
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Row helpers ──────────────────────────────────────────────────────

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-white/50 block">
        {label}
      </span>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
    />
  );
}

function RangeInput({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-white/50 block">
        {label} {value.toFixed(1)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );
}

function DeleteButton({
  onClick,
  label = 'Delete',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mt-4 py-1.5 rounded-lg border border-red-500/40 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <Trash2 size={13} />
      <span>{label}</span>
    </button>
  );
}

// ── Player Inspector ──────────────────────────────────────────────────

function PlayerInspector({
  player,
  allPlayers,
  slideId,
  updatePlayer,
  addArrow,
  onRemove,
}: {
  player: Player;
  allPlayers: Player[];
  slideId: string;
  updatePlayer: (s: string, id: string, p: Partial<Player>) => void;
  addArrow: (s: string, arrow: ArrowAnnotation) => void;
  onRemove: () => void;
}) {
  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);
  const upStyle = (s: Partial<Player['style']>) =>
    up({ style: { ...player.style, ...s } });

  const activeMarkerOptionTab = useTacticalUnifiedStore(
    (s) => s.activeMarkerOptionTab,
  );
  const setActiveMarkerOptionTab = useTacticalUnifiedStore(
    (s) => s.setActiveMarkerOptionTab,
  );
  const currentTab = activeMarkerOptionTab || 'vision';

  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setConnectingPlayerId = useTacticalUnifiedStore(
    (s) => s.setConnectingPlayerId,
  );
  const movePlayerToBench = useTacticalUnifiedStore((s) => s.movePlayerToBench);
  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);
  const isConnecting = connectingPlayerId === player.id;

  const [newBadgeText, setNewBadgeText] = useState('');

  // Vision cone
  const hasVisionCone = !!player.visionCone && player.visionCone.visible;
  const toggleVisionCone = () => {
    if (hasVisionCone) {
      up({ visionCone: undefined });
    } else {
      up({
        visionCone: {
          id: crypto.randomUUID(),
          angleRad: 0,
          spreadRad: Math.PI / 3, // 60°
          radius: 13,
          color: player.style.color || '#3b82f6',
          opacity: 0.3,
          visible: true,
        },
      });
    }
  };

  const updateVisionCone = (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => {
    if (!player.visionCone) return;
    up({ visionCone: { ...player.visionCone, ...patch } });
  };

  // Badges
  const addBadge = (
    label: string,
    color = '#f59e0b',
    textColor = '#000000',
  ) => {
    if (!label.trim()) return;
    const badge = {
      id: crypto.randomUUID(),
      label: label.trim(),
      color,
      textColor,
      offsetX: 0,
      offsetY: -12,
      visible: true,
    };
    up({ badges: [...player.badges, badge] });
  };

  const removeBadge = (badgeId: string) => {
    up({ badges: player.badges.filter((b) => b.id !== badgeId) });
  };

  // Connect lines
  const removeConnectLine = (lineId: string) => {
    up({ connectLines: player.connectLines.filter((l) => l.id !== lineId) });
  };

  // Tab click actions
  const handleTabClick = (tab: MarkerOptionTab) => {
    setActiveMarkerOptionTab(tab);
    if (tab === 'vision') {
      if (!player.visionCone?.visible) {
        up({
          visionCone: {
            id: crypto.randomUUID(),
            angleRad: 0,
            spreadRad: Math.PI / 3,
            radius: 13,
            color: player.style.color || '#3b82f6',
            opacity: 0.3,
            visible: true,
          },
        });
      }
    } else if (tab === 'connect') {
      setConnectingPlayerId(player.id);
    } else if (tab === 'arrow_solid') {
      const dir = player.team === 'away' ? -15 : 15;
      addArrow(slideId, {
        id: crypto.randomUUID(),
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        sourcePlayerId: player.id,
        points: [
          { x: player.x, y: player.y },
          {
            x: player.x + dir,
            y: player.y,
          },
        ],
        color: player.style.color || '#38bdf8',
        strokeWidth: 3,
        dashArray: [],
        arrowHead: true,
        endMarker: 'arrow',
      });
    } else if (tab === 'arrow_dash') {
      const dir = player.team === 'away' ? -15 : 15;
      addArrow(slideId, {
        id: crypto.randomUUID(),
        annotationType: 'arrow',
        arrowType: 'move',
        curveType: 'straight',
        sourcePlayerId: player.id,
        points: [
          { x: player.x, y: player.y },
          {
            x: player.x + dir,
            y: player.y,
          },
        ],
        color: '#fbbf24',
        strokeWidth: 3,
        dashArray: [6, 4],
        arrowHead: true,
        endMarker: 'arrow',
      });
    } else if (tab === 'focus') {
      if (!player.focus?.enabled) {
        up({
          focus: {
            enabled: true,
            color: '#fbbf24',
            radius: 3,
            opacity: 0.35,
            style: 'spotlight',
          },
        });
      }
    } else if (tab === 'badge') {
      if (player.badges.length === 0) {
        addBadge('KEY', '#f59e0b', '#000000');
      }
    }
  };

  const angleDeg = player.visionCone
    ? Math.round((player.visionCone.angleRad * 180) / Math.PI)
    : 0;
  const spreadDeg = player.visionCone
    ? Math.round((player.visionCone.spreadRad * 180) / Math.PI)
    : 60;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-slate-200 custom-scrollbar">
      {/* ── Player Header & Bench/Pitch Jump ── */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-white/30"
            style={{ backgroundColor: player.style.color || '#3b82f6' }}
          >
            {player.shirtNo || '•'}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">
              {player.name || `Player ${player.shirtNo || ''}`}
            </span>
            <span className="text-[10px] text-white/40 font-mono">
              {player.area === 'pitch'
                ? 'On Pitch (Placed)'
                : 'Substitute (Bench)'}
            </span>
          </div>
        </div>

        {player.area === 'pitch' ? (
          <button
            type="button"
            onClick={() => {
              movePlayerToBench(slideId, player.id);
              setRightPanelTab('formation_sub');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
            title="Move player from pitch to bench"
          >
            <ArrowDownLeft size={12} />
            <span>Send to Bench</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              movePlayerToPitch(slideId, player.id, 50, 50);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
            title="Place player on pitch"
          >
            <Plus size={12} />
            <span>Place on Pitch</span>
          </button>
        )}
      </div>

      {/* ── 7-Tab Icon Navigation Bar ── */}
      <div className="grid grid-cols-7 gap-1 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => handleTabClick('vision')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all cursor-pointer ${
            currentTab === 'vision'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Vision Cone (Click to enable)"
        >
          <Eye size={14} />
          <span className="text-[9px] mt-1 font-medium leading-none">
            Vision
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('connect')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all cursor-pointer ${
            currentTab === 'connect'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Connect (Click to link players)"
        >
          <Link size={14} />
          <span className="text-[9px] mt-1 font-medium leading-none">
            Connect
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('arrow_solid')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all cursor-pointer ${
            currentTab === 'arrow_solid'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Solid Arrow (Click to add)"
        >
          <MoveRight size={14} />
          <span className="text-[9px] mt-1 font-medium leading-none">
            Solid
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('arrow_dash')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all cursor-pointer ${
            currentTab === 'arrow_dash'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Dashed Arrow (Click to add)"
        >
          <DashedArrowIcon size={14} />
          <span className="text-[9px] mt-1 font-medium leading-none">
            Dashed
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('focus')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all cursor-pointer ${
            currentTab === 'focus'
              ? 'bg-yellow-500 text-black font-bold shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Focus / Spotlight (Click to highlight)"
        >
          <Sparkles size={14} />
          <span className="text-[9px] mt-1 leading-none">Focus</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('badge')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all cursor-pointer ${
            currentTab === 'badge'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Badge (Click to add KEY badge)"
        >
          <Award size={14} />
          <span className="text-[9px] mt-1 font-medium leading-none">
            Badge
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('basic')}
          className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-lg transition-all cursor-pointer ${
            currentTab === 'basic'
              ? 'bg-zinc-700 text-white shadow-md'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Basic Settings"
        >
          <Settings size={14} />
          <span className="text-[9px] mt-1 font-medium leading-none">
            Basic
          </span>
        </button>
      </div>

      {/* ── Tab Content ── */}

      {/* 1. Vision (Vision Cone) */}
      {currentTab === 'vision' && (
        <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Eye size={14} className="text-blue-400" />
              Vision Cone
            </span>
            <button
              type="button"
              onClick={toggleVisionCone}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                hasVisionCone
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/10 text-white/50 hover:text-white'
              }`}
            >
              {hasVisionCone ? 'ON' : 'OFF'}
            </button>
          </div>

          {hasVisionCone && player.visionCone ? (
            <div className="space-y-3 pt-1">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200/90 leading-tight">
                💡 Drag vision cone handles directly on canvas to adjust
                direction, length, and spread angle.
              </div>
              <RangeInput
                label="Direction (°)"
                value={angleDeg}
                min={0}
                max={360}
                step={5}
                onChange={(deg) =>
                  updateVisionCone({ angleRad: (deg * Math.PI) / 180 })
                }
              />
              <RangeInput
                label="Spread Angle (°)"
                value={spreadDeg}
                min={20}
                max={120}
                step={5}
                onChange={(deg) =>
                  updateVisionCone({ spreadRad: (deg * Math.PI) / 180 })
                }
              />
              <RangeInput
                label="Length"
                value={player.visionCone.radius}
                min={10}
                max={60}
                step={2}
                onChange={(rad) => updateVisionCone({ radius: rad })}
              />
              <Row label="Color">
                <ColorInput
                  value={player.visionCone.color}
                  onChange={(c) => updateVisionCone({ color: c })}
                />
              </Row>
              <RangeInput
                label="Opacity"
                value={player.visionCone.opacity}
                min={0.1}
                max={0.8}
                step={0.05}
                onChange={(op) => updateVisionCone({ opacity: op })}
              />
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-white/40">
              Click "ON" to activate vision cone
            </div>
          )}
        </div>
      )}

      {/* 2. Connector (Connect Line) */}
      {currentTab === 'connect' && (
        <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Link size={14} className="text-emerald-400" />
              Player Connectors
            </span>
            <button
              type="button"
              onClick={() => {
                if (isConnecting) {
                  setConnectingPlayerId(null);
                } else {
                  setConnectingPlayerId(player.id);
                }
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isConnecting
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
              }`}
            >
              <Plus size={12} />
              {isConnecting ? 'Selecting...' : 'Add'}
            </button>
          </div>

          {isConnecting && (
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
              <span className="text-[11px] font-medium leading-tight">
                Click a target player on pitch
              </span>
              <button
                type="button"
                onClick={() => setConnectingPlayerId(null)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white shrink-0 ml-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {player.connectLines.length > 0 ? (
            <div className="space-y-2">
              {player.connectLines.map((line) => {
                const target = allPlayers.find((p) => p.id === line.toPlayerId);
                return (
                  <div
                    key={line.id}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white/90 truncate">
                        → {target?.name || `Player #${target?.shirtNo || '?'}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeConnectLine(line.id)}
                        className="p-1 rounded hover:bg-white/10 text-red-400 hover:text-red-300 cursor-pointer"
                        title="Delete connector"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[10px] text-white/50">
                        Line Style
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextStyle =
                            line.lineStyle === 'dashed' ? 'solid' : 'dashed';
                          up({
                            connectLines: player.connectLines.map((l) =>
                              l.id === line.id
                                ? { ...l, lineStyle: nextStyle }
                                : l,
                            ),
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white/80 cursor-pointer"
                      >
                        {line.lineStyle === 'dashed' ? 'Dashed' : 'Solid'}
                      </button>
                    </div>

                    <Row label="Color">
                      <ColorInput
                        value={line.color || player.style.color || '#3b82f6'}
                        onChange={(c) => {
                          up({
                            connectLines: player.connectLines.map((l) =>
                              l.id === line.id ? { ...l, color: c } : l,
                            ),
                          });
                        }}
                      />
                    </Row>
                  </div>
                );
              })}
            </div>
          ) : (
            !isConnecting && (
              <div className="py-6 text-center text-xs text-white/40">
                Click "+ Add" to connect to another player
              </div>
            )
          )}
        </div>
      )}

      {/* 3. Solid Arrow */}
      {currentTab === 'arrow_solid' && (
        <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <MoveRight size={14} className="text-sky-400" />
            Solid Arrow (Pass / Shoot)
          </span>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                const dir = player.team === 'away' ? -15 : 15;
                addArrow(slideId, {
                  id: crypto.randomUUID(),
                  annotationType: 'arrow',
                  arrowType: 'pass',
                  curveType: 'straight',
                  sourcePlayerId: player.id,
                  points: [
                    { x: player.x, y: player.y },
                    {
                      x: player.x + dir,
                      y: player.y,
                    },
                  ],
                  color: player.style.color || '#38bdf8',
                  strokeWidth: 3,
                  dashArray: [],
                  arrowHead: true,
                  endMarker: 'arrow',
                });
              }}
              className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} />+ Add solid arrow in player direction
            </button>
          </div>
        </div>
      )}

      {/* 4. Dashed Arrow */}
      {currentTab === 'arrow_dash' && (
        <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <DashedArrowIcon size={14} className="text-amber-400" />
            Dashed Arrow (Movement / Run)
          </span>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                const dir = player.team === 'away' ? -15 : 15;
                addArrow(slideId, {
                  id: crypto.randomUUID(),
                  annotationType: 'arrow',
                  arrowType: 'move',
                  curveType: 'straight',
                  sourcePlayerId: player.id,
                  points: [
                    { x: player.x, y: player.y },
                    {
                      x: player.x + dir,
                      y: player.y,
                    },
                  ],
                  color: '#fbbf24',
                  strokeWidth: 3,
                  dashArray: [6, 4],
                  arrowHead: true,
                  endMarker: 'arrow',
                });
              }}
              className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} />+ Add dashed arrow in player direction
            </button>
          </div>
        </div>
      )}

      {/* 5. Focus / Spotlight */}
      {currentTab === 'focus' && (
        <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-yellow-400" />
              Focus (Spotlight)
            </span>
            <button
              type="button"
              onClick={() => {
                const nextEnabled = !(player.focus?.enabled ?? false);
                up({
                  focus: {
                    enabled: nextEnabled,
                    color: player.focus?.color ?? '#fbbf24',
                    radius: player.focus?.radius ?? 22,
                    opacity: player.focus?.opacity ?? 0.35,
                    style: player.focus?.style ?? 'spotlight',
                  },
                });
              }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                player.focus?.enabled
                  ? 'bg-yellow-500 text-black shadow-sm'
                  : 'bg-white/10 text-white/50 hover:text-white'
              }`}
            >
              {player.focus?.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {player.focus?.enabled ? (
            <div className="space-y-3 pt-1">
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-200/90 leading-tight">
                💡 Highlight key players with spotlight focus effect.
              </div>

              <Row label="Spotlight Color">
                <ColorInput
                  value={player.focus.color ?? '#fbbf24'}
                  onChange={(c) =>
                    up({
                      focus: {
                        ...(player.focus ?? {
                          enabled: true,
                          radius: 22,
                          opacity: 0.35,
                          style: 'spotlight',
                        }),
                        color: c,
                      },
                    })
                  }
                />
              </Row>

              <RangeInput
                label="Spotlight Radius"
                value={player.focus.radius ?? 3}
                min={1}
                max={6}
                step={0.5}
                onChange={(rad) =>
                  up({
                    focus: {
                      ...(player.focus ?? {
                        enabled: true,
                        color: '#fbbf24',
                        opacity: 0.35,
                        style: 'spotlight',
                      }),
                      radius: rad,
                    },
                  })
                }
              />

              <RangeInput
                label="Intensity (Opacity)"
                value={player.focus.opacity ?? 0.35}
                min={0.1}
                max={0.8}
                step={0.05}
                onChange={(op) =>
                  up({
                    focus: {
                      ...(player.focus ?? {
                        enabled: true,
                        color: '#fbbf24',
                        radius: 3,
                        style: 'spotlight',
                      }),
                      opacity: op,
                    },
                  })
                }
              />
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-white/40">
              Click "ON" to activate spotlight focus
            </div>
          )}
        </div>
      )}

      {/* 6. Badges */}
      {currentTab === 'badge' && (
        <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Award size={14} className="text-purple-400" />
            Player Badges
          </span>

          {/* Existing badges */}
          {player.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 py-1">
              {player.badges.map((b) => (
                <span
                  key={b.id}
                  style={{ backgroundColor: b.color, color: b.textColor }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm"
                >
                  {b.label}
                  <button
                    type="button"
                    onClick={() => removeBadge(b.id)}
                    className="hover:opacity-70 text-xs leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Preset Badges */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => addBadge('KEY', '#f59e0b', '#000000')}
              className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
            >
              + KEY
            </button>
            <button
              type="button"
              onClick={() => addBadge('★', '#eab308', '#000000')}
              className="px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] font-bold hover:bg-yellow-500/30 transition-all cursor-pointer"
            >
              + ★
            </button>
            <button
              type="button"
              onClick={() => addBadge('C', '#3b82f6', '#ffffff')}
              className="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold hover:bg-blue-500/30 transition-all cursor-pointer"
            >
              + C
            </button>
            <button
              type="button"
              onClick={() => addBadge('TARGET', '#ef4444', '#ffffff')}
              className="px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold hover:bg-red-500/30 transition-all cursor-pointer"
            >
              + TARGET
            </button>
          </div>

          {/* Custom Badge Form */}
          <div className="flex items-center gap-1 mt-1">
            <input
              type="text"
              placeholder="Custom badge label"
              value={newBadgeText}
              onChange={(e) => setNewBadgeText(e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                addBadge(newBadgeText);
                setNewBadgeText('');
              }}
              disabled={!newBadgeText.trim()}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-medium text-white transition-all cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* 7. Basic Settings */}
      {currentTab === 'basic' && (
        <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Settings size={14} className="text-zinc-400" />
            Basic Info & Display Style
          </span>

          <Row label="Color">
            <ColorInput
              value={player.style.color}
              onChange={(v) => upStyle({ color: v })}
            />
          </Row>
          <RangeInput
            label="Size Scale"
            value={player.style.sizeScale}
            min={0.4}
            max={2.0}
            step={0.1}
            onChange={(v) => upStyle({ sizeScale: v })}
          />
          <RangeInput
            label="Border Width"
            value={player.style.strokeWidth}
            min={0}
            max={5}
            step={0.5}
            onChange={(v) => upStyle({ strokeWidth: v })}
          />
          <Row label="Team">
            <select
              value={player.team}
              onChange={(e) => up({ team: e.target.value as Player['team'] })}
              className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral</option>
            </select>
          </Row>
          <Row label="Shirt Number">
            <TextInput
              value={player.shirtNo ?? ''}
              onChange={(v) => up({ shirtNo: v })}
              maxLength={3}
            />
          </Row>
          <Row label="Player Name">
            <TextInput
              value={player.name ?? ''}
              onChange={(v) => up({ name: v })}
            />
          </Row>
          <Row label="Position">
            <TextInput
              value={player.position ?? ''}
              onChange={(v) => up({ position: v })}
            />
          </Row>
          <Row label="Label Display">
            <select
              value={player.style.bottomLabel}
              onChange={(e) =>
                upStyle({
                  bottomLabel: e.target.value as Player['style']['bottomLabel'],
                })
              }
              className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="number">Number</option>
              <option value="none">Hidden</option>
            </select>
          </Row>
          <Row label="Inside Content">
            <select
              value={player.style.insideContent}
              onChange={(e) =>
                upStyle({
                  insideContent: e.target
                    .value as Player['style']['insideContent'],
                })
              }
              className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="number">Number</option>
              <option value="photo">Photo</option>
              <option value="none">None</option>
            </select>
          </Row>
          {player.style.insideContent === 'photo' && (
            <Row label="Photo URL">
              <TextInput
                value={player.style.photoUrl ?? ''}
                onChange={(v) => upStyle({ photoUrl: v })}
              />
            </Row>
          )}
        </div>
      )}

      {/* ── Delete Player Button ── */}
      <DeleteButton onClick={onRemove} label="Delete Player" />
    </div>
  );
}

// ── Arrow Inspector ───────────────────────────────────────────────────

function ArrowInspector({
  arrow,
  slideId,
  updateArrow,
  onRemove,
}: {
  arrow: ArrowAnnotation;
  slideId: string;
  updateArrow: (s: string, id: string, p: Partial<ArrowAnnotation>) => void;
  onRemove: () => void;
}) {
  const up = (p: Partial<ArrowAnnotation>) => updateArrow(slideId, arrow.id, p);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      <Row label="Color">
        <ColorInput value={arrow.color} onChange={(v) => up({ color: v })} />
      </Row>
      <RangeInput
        label="Line Width"
        value={arrow.strokeWidth}
        min={1}
        max={10}
        step={0.5}
        onChange={(v) => up({ strokeWidth: v })}
      />
      <Row label="Curve">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 w-full">
          <button
            type="button"
            onClick={() =>
              up({
                curveType: 'straight',
                controlPoint: undefined,
              })
            }
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded text-xs font-medium transition-all ${
              arrow.curveType === 'straight' ||
              (!arrow.curveType && !arrow.controlPoint)
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Straight"
            aria-label="Straight"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
            <span>Straight</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const p0 = arrow.points[0] ?? { x: 20, y: 50 };
              const p1 = arrow.points[1] ?? { x: 40, y: 50 };
              const midX = (p0.x + p1.x) / 2;
              const midY = (p0.y + p1.y) / 2;
              const dx = p1.x - p0.x;
              const dy = p1.y - p0.y;
              const len = Math.hypot(dx, dy) || 1;
              const normalX = -dy / len;
              const normalY = dx / len;
              const offset = 8;
              // 頂点 M を mid + normal * offset に配置するための制御点: P_ctrl = mid + normal * (offset * 2)
              up({
                curveType: 'curved',
                controlPoint: arrow.controlPoint ?? {
                  x: midX + normalX * (offset * 2),
                  y: midY + normalY * (offset * 2),
                },
              });
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded text-xs font-medium transition-all ${
              arrow.curveType === 'curved' ||
              arrow.curveType === 'arc' ||
              arrow.controlPoint !== undefined
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Curved"
            aria-label="Curved"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 17 C 8 17, 14 7, 20 7" />
            </svg>
            <span>Curved</span>
          </button>
        </div>
      </Row>
      <Row label="Type">
        <select
          value={arrow.arrowType}
          onChange={(e) =>
            up({ arrowType: e.target.value as ArrowAnnotation['arrowType'] })
          }
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="pass">Pass</option>
          <option value="move">Move</option>
          <option value="dribble">Dribble</option>
          <option value="defend">Defend</option>
          <option value="run">Run</option>
          <option value="generic">Generic</option>
        </select>
      </Row>
      <DeleteButton onClick={onRemove} label="Delete Arrow" />
    </div>
  );
}

// ── Zone Inspector ────────────────────────────────────────────────────

function ZoneInspector({
  zone,
  slideId,
  updateZone,
  onRemove,
}: {
  zone: ZoneAnnotation;
  slideId: string;
  updateZone: (s: string, id: string, p: Partial<ZoneAnnotation>) => void;
  onRemove: () => void;
}) {
  const up = (p: Partial<ZoneAnnotation>) => updateZone(slideId, zone.id, p);
  const isPolygon = zone.shapeType === 'polygon';

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      {/* Shape toggle (Rectangle / Ellipse) */}
      {!isPolygon && (
        <Row label="Shape">
          <div className="grid grid-cols-2 gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => up({ shapeType: 'rect' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                zone.shapeType === 'rect' || !zone.shapeType
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Square size={13} />
              <span>Rectangle</span>
            </button>
            <button
              type="button"
              onClick={() => up({ shapeType: 'ellipse' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                zone.shapeType === 'ellipse'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Circle size={13} />
              <span>Ellipse</span>
            </button>
          </div>
        </Row>
      )}

      {isPolygon && (
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
          <span className="font-medium">Free Zone (Polygon)</span>
          <span className="text-[10px] text-emerald-400/70 font-mono">
            {zone.points.length} Vertices
          </span>
        </div>
      )}

      <Row label="Fill Color">
        <ColorInput value={zone.color} onChange={(v) => up({ color: v })} />
      </Row>

      <RangeInput
        label="Opacity"
        value={zone.opacity ?? 0.25}
        min={0.05}
        max={1}
        step={0.05}
        onChange={(v) => up({ opacity: v })}
      />

      <RangeInput
        label="Border Width"
        value={zone.strokeWidth ?? 2}
        min={0}
        max={8}
        step={0.5}
        onChange={(v) => up({ strokeWidth: v })}
      />

      <Row label="Border Color">
        <ColorInput
          value={zone.strokeColor ?? zone.color}
          onChange={(v) => up({ strokeColor: v })}
        />
      </Row>

      <Row label="Type">
        <select
          value={zone.zoneType}
          onChange={(e) =>
            up({ zoneType: e.target.value as ZoneAnnotation['zoneType'] })
          }
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="highlight">Highlight</option>
          <option value="space">Space</option>
          <option value="danger">Danger</option>
          <option value="pressing">Pressing</option>
          <option value="buildup">Buildup</option>
          <option value="generic">Generic</option>
        </select>
      </Row>

      <DeleteButton onClick={onRemove} label="Delete Zone" />
    </div>
  );
}

// ── Text Inspector ────────────────────────────────────────────────────

function TextInspector({
  text,
  slideId,
  updateText,
  onRemove,
}: {
  text: TextAnnotation;
  slideId: string;
  updateText: (s: string, id: string, p: Partial<TextAnnotation>) => void;
  onRemove: () => void;
}) {
  const up = (p: Partial<TextAnnotation>) => updateText(slideId, text.id, p);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      <Row label="Text Content">
        <textarea
          value={text.content}
          maxLength={200}
          onChange={(e) => up({ content: e.target.value })}
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
          rows={3}
        />
      </Row>
      <Row label="Color">
        <ColorInput value={text.color} onChange={(v) => up({ color: v })} />
      </Row>
      <RangeInput
        label="Font Size"
        value={text.fontSize}
        min={8}
        max={72}
        step={1}
        onChange={(v) => up({ fontSize: v })}
      />
      <Row label="Style">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => up({ bold: !text.bold })}
            className={`px-2 py-1 rounded text-xs font-bold ${text.bold ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'}`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => up({ italic: !text.italic })}
            className={`px-2 py-1 rounded text-xs italic ${text.italic ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'}`}
          >
            I
          </button>
        </div>
      </Row>
      <DeleteButton onClick={onRemove} label="Delete Text" />
    </div>
  );
}
