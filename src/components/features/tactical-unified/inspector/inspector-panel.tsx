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
  Hash,
  Image as ImageIcon,
  Info,
  Layers,
  LayoutGrid,
  Link,
  MoveRight,
  Pipette,
  Plus,
  Settings,
  Sparkles,
  Square,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
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
  type SelectedObject,
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

  // ── 直近で選択されたオブジェクトの保持 (パネル外クリック時も直近のプロパティを保持) ──
  const lastSelectedRef = useRef<SelectedObject | null>(null);

  useEffect(() => {
    if (single) {
      lastSelectedRef.current = single;
    }
  }, [single]);

  // 現在選択中のオブジェクト、または直近で選択されていたオブジェクト
  const effectiveSingle = single || lastSelectedRef.current;

  // ── Multiple Players Selected ─────────────────────────────────────────
  const selectedPlayerObjects = selectedObjects.filter(
    (o) => o.kind === 'player',
  );
  if (selectedObjects.length > 1 && selectedPlayerObjects.length > 0) {
    const selectedPlayers = selectedPlayerObjects
      .map((o) => activeSlide?.players.find((p) => p.id === o.id))
      .filter((p): p is Player => Boolean(p));

    if (selectedPlayers.length > 0) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title={`Multiple Players (${selectedPlayers.length})`}
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <MultiPlayerInspector
            players={selectedPlayers}
            slideId={activeSlideId}
            updatePlayer={updatePlayer}
            removePlayer={removePlayer}
            clearSelection={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Player Selected (または直近選択された Player) ─────────────────────
  if (effectiveSingle?.kind === 'player') {
    const player = activeSlide?.players.find(
      (p) => p.id === effectiveSingle.id,
    );
    if (player && activeSlide) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title={player.style.markerType === 'ring' ? 'Ring' : 'Player'}
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <PlayerInspector
            player={player}
            allPlayers={activeSlide.players}
            slideId={activeSlideId}
            updatePlayer={updatePlayer}
            addArrow={addArrow}
            onRemove={() => {
              removePlayer(activeSlideId, player.id);
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Arrow Selected (または直近選択された Arrow) ──────────────────────
  if (effectiveSingle?.kind === 'arrow') {
    const arrow = activeSlide?.arrows.find((a) => a.id === effectiveSingle.id);
    if (arrow && activeSlide) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title="Arrow & Line"
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <ArrowInspector
            arrow={arrow}
            slideId={activeSlideId}
            updateArrow={updateArrow}
            onRemove={() => {
              removeArrow(activeSlideId, arrow.id);
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Zone Selected (または直近選択された Zone) ────────────────────────
  if (effectiveSingle?.kind === 'zone') {
    const zone = activeSlide?.zones.find((z) => z.id === effectiveSingle.id);
    if (zone && activeSlide) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title="Zone"
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <ZoneInspector
            zone={zone}
            slideId={activeSlideId}
            updateZone={updateZone}
            onRemove={() => {
              removeZone(activeSlideId, zone.id);
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Text Selected (または直近選択された Text) ────────────────────────
  if (effectiveSingle?.kind === 'text') {
    const textObj = activeSlide?.texts.find((t) => t.id === effectiveSingle.id);
    if (textObj && activeSlide) {
      return (
        <div className="flex flex-col h-full">
          <InspectorHeader
            title="Text"
            onClose={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
            onDeselect={() => {
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
          <TextInspector
            text={textObj}
            slideId={activeSlideId}
            updateText={updateText}
            onRemove={() => {
              removeText(activeSlideId, textObj.id);
              lastSelectedRef.current = null;
              clearSelection();
            }}
          />
        </div>
      );
    }
  }

  // ── Ball Selected (または直近選択された Ball) ────────────────────────
  if (effectiveSingle?.kind === 'ball' && activeSlide) {
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="Ball"
          onClose={() => {
            lastSelectedRef.current = null;
            clearSelection();
          }}
          onDeselect={() => {
            lastSelectedRef.current = null;
            clearSelection();
          }}
        />
        <BallInspector slideId={activeSlideId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <InspectorHeader
        title="Slide Settings"
        onClose={() => {
          setRightPanelTab('formation');
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

      {/* 3. Pitch Background */}
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

// ── Multi-Player Inspector ─────────────────────────────────────────────

function MultiPlayerInspector({
  players,
  slideId,
  updatePlayer,
  removePlayer,
  clearSelection,
}: {
  players: Player[];
  slideId: string;
  updatePlayer: (s: string, id: string, p: Partial<Player>) => void;
  removePlayer: (s: string, id: string) => void;
  clearSelection: () => void;
}) {
  const handleBatchInsideContent = (
    insideContent: Player['style']['insideContent'],
  ) => {
    players.forEach((p) => {
      updatePlayer(slideId, p.id, {
        style: { ...p.style, insideContent },
      });
    });
  };

  const handleBatchBottomLabel = (
    bottomLabel: Player['style']['bottomLabel'],
  ) => {
    players.forEach((p) => {
      updatePlayer(slideId, p.id, {
        style: { ...p.style, bottomLabel },
      });
    });
  };

  const handleBatchColor = (color: string) => {
    players.forEach((p) => {
      updatePlayer(slideId, p.id, {
        style: { ...p.style, color },
      });
    });
  };

  const handleBatchSizeScale = (sizeScale: number) => {
    players.forEach((p) => {
      updatePlayer(slideId, p.id, {
        style: { ...p.style, sizeScale },
      });
    });
  };

  const handleRemoveAll = () => {
    players.forEach((p) => {
      removePlayer(slideId, p.id);
    });
    clearSelection();
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
        <span className="font-bold">{players.length} players selected</span>
        <p className="text-[11px] text-white/50 mt-0.5">
          Changes applied here will update all selected players simultaneously.
        </p>
      </div>

      <div className="space-y-3.5 p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-amber-400" />
          Batch Appearance
        </span>

        <Row label="Inside Marker Content">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => handleBatchInsideContent('number')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Hash size={15} />
              <span className="text-[10px] mt-1 font-medium">Number</span>
            </button>
            {players.some((p) => Boolean(p.style.photoUrl)) ? (
              <button
                type="button"
                onClick={() => handleBatchInsideContent('photo')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ImageIcon size={15} />
                <span className="text-[10px] mt-1 font-medium">Photo</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex flex-col items-center justify-center py-2 px-1 rounded-md opacity-30 text-white/40 cursor-not-allowed"
                title="No photos configured on selected players"
              >
                <ImageIcon size={15} />
                <span className="text-[10px] mt-1 font-medium">Photo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleBatchInsideContent('none')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Circle size={15} />
              <span className="text-[10px] mt-1 font-medium">Empty</span>
            </button>
          </div>
        </Row>

        <Row label="Bottom Label Display">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/40 border border-white/10">
            {(['name', 'number', 'none'] as const).map((lbl) => (
              <button
                key={lbl}
                type="button"
                onClick={() => handleBatchBottomLabel(lbl)}
                className="py-1.5 px-1 rounded-md text-[10px] font-medium uppercase text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {lbl === 'none' ? 'Hidden' : lbl}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Player Color">
          <ColorInput
            value={players[0]?.style.color || '#3b82f6'}
            onChange={handleBatchColor}
          />
        </Row>

        <RangeInput
          label="Marker Size"
          value={players[0]?.style.sizeScale ?? 1.0}
          min={0.6}
          max={1.6}
          step={0.1}
          onChange={handleBatchSizeScale}
        />
      </div>

      <DeleteButton
        onClick={handleRemoveAll}
        label={`Delete ${players.length} Players`}
      />
    </div>
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
            color: '#ffffff',
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
      {/* ── Player Header & Bench/Pitch Jump (Ring ではない通常の選手マーカーの場合のみ表示) ── */}
      {player.style.markerType !== 'ring' && (
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
                setRightPanelTab('squad');
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
      )}

      {/* ── Top Row: Basic Settings Toggle ── */}
      <div className="flex items-center justify-between p-1 rounded-xl bg-white/5 border border-white/10">
        <button
          type="button"
          onClick={() => handleTabClick('basic')}
          className={`flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentTab === 'basic'
              ? 'bg-zinc-700 text-white shadow-md ring-1 ring-white/20'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          title="Basic Settings (Inside content, label, style, scale, badges)"
        >
          <Settings size={14} className="text-zinc-400" />
          <span>Basic Settings</span>
        </button>
      </div>

      {/* ── 6-Tab Object Action Icons: Solid, Dashed, Connect, Vision, Focus, Spuit ── */}
      <div className="grid grid-cols-6 gap-1 p-1 rounded-xl bg-white/5 border border-white/10 shrink-0">
        {/* 1. Solid Arrow */}
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

        {/* 2. Dashed Arrow */}
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

        {/* 3. Connect */}
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

        {/* 4. Vision Cone */}
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

        {/* 5. Focus (Spotlight) */}
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

        {/* 6. Spuit (Eyedropper) */}
        <button
          type="button"
          onClick={async () => {
            if (typeof window !== 'undefined' && 'EyeDropper' in window) {
              try {
                // @ts-expect-error EyeDropper is a modern browser API
                const eyeDropper = new window.EyeDropper();
                const result = await eyeDropper.open();
                if (result?.sRGBHex) {
                  upStyle({ color: result.sRGBHex });
                }
              } catch {
                // user cancelled
              }
            } else {
              handleTabClick('basic');
            }
          }}
          className="flex flex-col items-center justify-center py-2 px-0.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          title="Spuit (Pick color from screen)"
        >
          <Pipette size={14} className="text-pink-400" />
          <span className="text-[9px] mt-1 font-medium leading-none">
            Spuit
          </span>
        </button>
      </div>

      {/* ── Tab Content ── */}

      {/* 1. Vision (Vision Cone) */}
      {currentTab === 'vision' && (
        <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Eye size={14} className="text-blue-400" />
              Vision Cone
            </span>
            <button
              type="button"
              onClick={toggleVisionCone}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                hasVisionCone
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'bg-white/10 text-white/50 hover:text-white'
              }`}
            >
              {hasVisionCone ? 'ON' : 'OFF'}
            </button>
          </div>

          {hasVisionCone && player.visionCone ? (
            <div className="space-y-3 pt-1">
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200/90 leading-tight">
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
              Click &quot;ON&quot; to activate player vision cone
            </div>
          )}
        </div>
      )}

      {/* 2. Connector (Connect Line) */}
      {currentTab === 'connect' && (
        <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
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
              {isConnecting ? 'Selecting...' : 'Add Link'}
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
                    className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white/90 truncate flex items-center gap-1">
                        <Link size={12} className="text-emerald-400 shrink-0" />
                        <span>
                          →{' '}
                          {target?.name || `Player #${target?.shirtNo || '?'}`}
                        </span>
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
                Click &quot;+ Add Link&quot; to connect to another player
              </div>
            )
          )}
        </div>
      )}

      {/* 3. Solid Arrow */}
      {currentTab === 'arrow_solid' && (
        <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
          <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
            <MoveRight size={14} className="text-sky-400" />
            Solid Arrow (Pass / Shoot)
          </span>

          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200 leading-relaxed">
            Attach a direct pass or shot vector from this player.
          </div>

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
              className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} />+ Add solid arrow in player direction
            </button>
          </div>
        </div>
      )}

      {/* 4. Dashed Arrow */}
      {currentTab === 'arrow_dash' && (
        <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
          <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
            <DashedArrowIcon size={14} className="text-amber-400" />
            Dashed Arrow (Movement / Run)
          </span>

          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-relaxed">
            Attach an off-the-ball run or tactical trajectory vector.
          </div>

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
              className="w-full py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={14} />+ Add dashed arrow in player direction
            </button>
          </div>
        </div>
      )}

      {/* 5. Focus / Spotlight */}
      {currentTab === 'focus' && (
        <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
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
                  ? 'bg-yellow-500 text-black shadow-sm ring-1 ring-yellow-300'
                  : 'bg-white/10 text-white/50 hover:text-white'
              }`}
            >
              {player.focus?.enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {player.focus?.enabled ? (
            <div className="space-y-3 pt-1">
              <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-200/90 leading-tight">
                💡 Highlight key players with spotlight focus effect.
              </div>

              <Row label="Spotlight Color">
                <ColorInput
                  value={player.focus.color ?? '#ffffff'}
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
              Click &quot;ON&quot; to activate spotlight focus
            </div>
          )}
        </div>
      )}

      {/* 6. Basic Settings */}
      {currentTab === 'basic' && (
        <div className="space-y-3.5">
          {/* Card: Inside Content (Marker Visual Center) */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={13} className="text-amber-400" />
              Inside Marker Content
            </span>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10">
              <button
                type="button"
                onClick={() => upStyle({ insideContent: 'number' })}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer ${
                  player.style.insideContent === 'number'
                    ? 'bg-blue-600 text-white font-bold shadow-md ring-1 ring-white/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Hash size={16} />
                <span className="text-[10px] mt-1">Number</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (player.style.photoUrl) {
                    upStyle({ insideContent: 'photo' });
                  }
                }}
                disabled={!player.style.photoUrl}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer ${
                  player.style.insideContent === 'photo'
                    ? 'bg-blue-600 text-white font-bold shadow-md ring-1 ring-white/30'
                    : !player.style.photoUrl
                      ? 'opacity-30 text-white/40 cursor-not-allowed'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title={
                  player.style.photoUrl
                    ? 'Display face photo'
                    : 'Set Photo URL below to enable'
                }
              >
                <ImageIcon size={16} />
                <span className="text-[10px] mt-1">Photo</span>
              </button>

              <button
                type="button"
                onClick={() => upStyle({ insideContent: 'none' })}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer ${
                  player.style.insideContent === 'none'
                    ? 'bg-blue-600 text-white font-bold shadow-md ring-1 ring-white/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Circle size={16} />
                <span className="text-[10px] mt-1">Empty</span>
              </button>
            </div>

            {/* Photo URL Input / Preview */}
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50">
                <span>Photo URL</span>
                {player.style.photoUrl && (
                  <span className="text-emerald-400 font-mono text-[9px]">
                    Linked
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {player.style.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.style.photoUrl}
                    alt={player.name || 'Player'}
                    className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0 bg-slate-800"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full border border-dashed border-white/20 flex items-center justify-center shrink-0 bg-white/5 text-white/30">
                    <User size={12} />
                  </div>
                )}
                <TextInput
                  value={player.style.photoUrl ?? ''}
                  onChange={(v) => {
                    const trimmed = v.trim();
                    upStyle({
                      photoUrl: trimmed || undefined,
                      insideContent:
                        !trimmed && player.style.insideContent === 'photo'
                          ? 'number'
                          : trimmed && player.style.insideContent !== 'none'
                            ? 'photo'
                            : player.style.insideContent,
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card: Bottom Label & Identity */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Tag size={13} className="text-sky-400" />
              Name & Label Display
            </span>

            {/* Label Display Segmented Buttons */}
            <Row label="Bottom Label Display">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/40 border border-white/10">
                {(['name', 'number', 'none'] as const).map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => upStyle({ bottomLabel: lbl })}
                    className={`py-1.5 px-1 rounded-md text-[10px] font-medium uppercase transition-all cursor-pointer ${
                      player.style.bottomLabel === lbl
                        ? 'bg-white/20 text-white font-bold shadow-sm'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {lbl === 'none' ? 'Hidden' : lbl}
                  </button>
                ))}
              </div>
            </Row>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Row label="Number">
                  <TextInput
                    value={player.shirtNo ?? ''}
                    onChange={(v) => up({ shirtNo: v })}
                    maxLength={3}
                  />
                </Row>
              </div>
              <div className="col-span-2">
                <Row label="Position">
                  <TextInput
                    value={player.position ?? ''}
                    onChange={(v) => up({ position: v })}
                  />
                </Row>
              </div>
            </div>

            <Row label="Player Name">
              <TextInput
                value={player.name ?? ''}
                onChange={(v) => up({ name: v })}
              />
            </Row>
          </div>

          {/* Card: Style & Geometry */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Settings size={13} className="text-zinc-400" />
              Marker Style & Scale
            </span>

            {/* Marker Type Switcher: 2D Circle vs 3D Foot Ring */}
            <Row label="Marker Type">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-black/40 border border-white/10 w-full">
                <button
                  type="button"
                  onClick={() => upStyle({ markerType: 'circle' })}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    (player.style.markerType ?? 'circle') === 'circle'
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Circle size={13} />
                  <span>2D Circle</span>
                </button>
                <button
                  type="button"
                  onClick={() => upStyle({ markerType: 'ring' })}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    player.style.markerType === 'ring'
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-sm leading-none">⭕</span>
                  <span>3D Ring</span>
                </button>
              </div>
            </Row>

            <Row label="Player Color">
              <ColorInput
                value={player.style.color}
                onChange={(v) => upStyle({ color: v })}
              />
            </Row>

            <RangeInput
              label="Marker Scale"
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

            <Row label="Team Assignment">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/40 border border-white/10">
                {(['home', 'away', 'neutral'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => up({ team: t })}
                    className={`py-1.5 px-1 rounded-md text-[10px] font-medium capitalize transition-all cursor-pointer ${
                      player.team === t
                        ? t === 'home'
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : t === 'away'
                            ? 'bg-red-600 text-white font-bold shadow-sm'
                            : 'bg-zinc-600 text-white font-bold shadow-sm'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Row>
          </div>

          {/* Card: Player Badges */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <Award size={13} className="text-purple-400" />
              Player Badges
            </span>

            {/* Existing badges */}
            {player.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-black/40 border border-white/10">
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
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-white/50 block">
                Quick Presets
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => addBadge('KEY', '#f59e0b', '#000000')}
                  className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer shadow-xs"
                >
                  + KEY
                </button>
                <button
                  type="button"
                  onClick={() => addBadge('★', '#eab308', '#000000')}
                  className="px-2.5 py-1 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] font-bold hover:bg-yellow-500/30 transition-all cursor-pointer shadow-xs"
                >
                  + ★
                </button>
                <button
                  type="button"
                  onClick={() => addBadge('C', '#3b82f6', '#ffffff')}
                  className="px-2.5 py-1 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold hover:bg-blue-500/30 transition-all cursor-pointer shadow-xs"
                >
                  + C
                </button>
                <button
                  type="button"
                  onClick={() => addBadge('TARGET', '#ef4444', '#ffffff')}
                  className="px-2.5 py-1 rounded-md bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold hover:bg-red-500/30 transition-all cursor-pointer shadow-xs"
                >
                  + TARGET
                </button>
              </div>
            </div>

            {/* Custom Badge Form */}
            <div className="pt-2 border-t border-white/5 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-white/50 block">
                Custom Label
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Custom badge label"
                  value={newBadgeText}
                  onChange={(e) => setNewBadgeText(e.target.value)}
                  className="flex-1 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    addBadge(newBadgeText);
                    setNewBadgeText('');
                  }}
                  disabled={!newBadgeText.trim()}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Button ── */}
      <DeleteButton
        onClick={onRemove}
        label={
          player.style.markerType === 'ring' ? 'Delete Ring' : 'Delete Player'
        }
      />
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

// ── Ball Inspector ────────────────────────────────────────────────────

function BallInspector({ slideId }: { slideId: string }) {
  const ball = useTacticalUnifiedStore((s) => selectActiveSlide(s)?.ball);
  const setBallVisible = useTacticalUnifiedStore((s) => s.setBallVisible);

  if (!ball) return null;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 space-y-1">
        <span className="font-semibold text-white">Ball Settings</span>
        <p className="text-[11px] text-white/50">
          Position: ({Math.round(ball.x)}%, {Math.round(ball.y)}%)
        </p>
      </div>

      <Row label="Visibility">
        <button
          type="button"
          onClick={() => setBallVisible(slideId, !ball.visible)}
          className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
            ball.visible
              ? 'bg-blue-600 text-white'
              : 'bg-white/10 text-white/50 hover:text-white'
          }`}
        >
          {ball.visible ? 'Visible' : 'Hidden'}
        </button>
      </Row>
    </div>
  );
}
