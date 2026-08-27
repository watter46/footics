'use client';

/**
 * inspector-panel.tsx
 * Right inspector — 選択オブジェクトのプロパティ詳細
 * 選手・矢印・ゾーン・テキストに対応
 */

import {
  Award,
  ChevronDown,
  Circle,
  Eye,
  Info,
  Layers,
  LayoutGrid,
  Link,
  MoveRight,
  Palette,
  Plus,
  Settings,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type {
  ArrowAnnotation,
  Player,
  Slide,
  TacticalProject,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';

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
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const updateArrow = useTacticalUnifiedStore((s) => s.updateArrow);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);
  const removeArrow = useTacticalUnifiedStore((s) => s.removeArrow);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);

  const setInspectorOpen = useTacticalUnifiedStore((s) => s.setInspectorOpen);
  const project = useTacticalUnifiedStore((s) => s.project);
  const setBackgroundType = useTacticalUnifiedStore((s) => s.setBackgroundType);
  const setTeamColor = useTacticalUnifiedStore((s) => s.setTeamColor);

  const single = selectedObjects.length === 1 ? selectedObjects[0] : null;

  if (!single || !activeSlide) {
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="プロジェクト & ピッチ"
          onClose={() => setInspectorOpen(false)}
        />
        <DefaultInspector
          project={project}
          activeSlide={activeSlide}
          setBackgroundType={setBackgroundType}
          setTeamColor={setTeamColor}
        />
      </div>
    );
  }

  if (single.kind === 'player') {
    const player = activeSlide.players.find((p) => p.id === single.id);
    if (!player)
      return (
        <InspectorHeader
          onClose={() => {
            clearSelection();
            setInspectorOpen(false);
          }}
        />
      );
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="選手"
          onClose={() => setInspectorOpen(false)}
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

  if (single.kind === 'arrow') {
    const arrow = activeSlide.arrows.find((a) => a.id === single.id);
    if (!arrow)
      return (
        <InspectorHeader
          onClose={() => {
            clearSelection();
            setInspectorOpen(false);
          }}
        />
      );
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="矢印"
          onClose={() => setInspectorOpen(false)}
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

  if (single.kind === 'zone') {
    const zone = activeSlide.zones.find((z) => z.id === single.id);
    if (!zone)
      return (
        <InspectorHeader
          onClose={() => {
            clearSelection();
            setInspectorOpen(false);
          }}
        />
      );
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="ゾーン"
          onClose={() => setInspectorOpen(false)}
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

  if (single.kind === 'text') {
    const text = activeSlide.texts.find((t) => t.id === single.id);
    if (!text)
      return (
        <InspectorHeader
          onClose={() => {
            clearSelection();
            setInspectorOpen(false);
          }}
        />
      );
    return (
      <div className="flex flex-col h-full">
        <InspectorHeader
          title="テキスト"
          onClose={() => setInspectorOpen(false)}
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
        setInspectorOpen(false);
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
        {title ? `インスペクター — ${title}` : 'インスペクター'}
      </span>
      <div className="flex items-center gap-1">
        {onDeselect && (
          <button
            type="button"
            onClick={onDeselect}
            className="px-1.5 py-0.5 rounded text-[10px] text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title="選択を解除"
          >
            選択解除
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          aria-label="パネルを閉じる"
          title="閉じる"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Default / Project Inspector (未選択時) ───────────────────────────

function DefaultInspector({
  project,
  activeSlide,
  setBackgroundType,
  setTeamColor,
}: {
  project: TacticalProject;
  activeSlide?: Slide;
  setBackgroundType: (t: TacticalProject['backgroundType']) => void;
  setTeamColor: (team: 'home' | 'away', primary: string) => void;
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
    { label: 'ピッチ (Pitch)', value: 'pitch' },
    { label: '画像背景 (Image)', value: 'image' },
    { label: '無地 (Blank)', value: 'blank' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      {/* ピッチ背景設定 */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <LayoutGrid size={13} className="text-emerald-400" />
          ピッチ背景
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {bgOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBackgroundType(opt.value)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left truncate ${
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

      {/* チームカラー設定 */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <Palette size={13} className="text-blue-400" />
          チームカラー
        </span>
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs text-white/70 block">ホーム</span>
            <ColorInput
              value={project.homeColor.primary}
              onChange={(c) => setTeamColor('home', c)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-white/70 block">アウェイ</span>
            <ColorInput
              value={project.awayColor.primary}
              onChange={(c) => setTeamColor('away', c)}
            />
          </div>
        </div>
      </div>

      {/* スライドサマリー */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={13} className="text-purple-400" />
          スライド要素
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 block">
              選手 (H / A)
            </span>
            <span className="font-mono font-bold text-white">
              {homeCount} <span className="text-white/40 font-normal">/</span>{' '}
              {awayCount}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/40 block">
              矢印 / ゾーン
            </span>
            <span className="font-mono font-bold text-white">
              {arrowCount} <span className="text-white/40 font-normal">/</span>{' '}
              {zoneCount}
            </span>
          </div>
        </div>
      </div>

      {/* ガイド */}
      <div className="pt-3 border-t border-white/10">
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200/80 leading-relaxed flex items-start gap-2">
          <Info size={14} className="shrink-0 text-blue-400 mt-0.5" />
          <span>
            ピッチ上の選手、矢印、ゾーン、テキストをクリックすると、詳細プロパティ（視野・コネクタ・バッジ等）を編集できます。
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
      <label className="text-[10px] uppercase tracking-wider text-white/50">
        {label}
      </label>
      {children}
    </div>
  );
}

const COLOR_PALETTE = [
  '#ffffff', // White
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#a855f7', // Purple
  '#06b6d4', // Cyan
];

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const normalizedValue = value.startsWith('#') && value.length === 7 ? value : '#ffffff';

  return (
    <div className="w-[70%] space-y-1.5" style={{ colorScheme: 'only light' }}>
      <div className="grid grid-cols-4 gap-1">
        {COLOR_PALETTE.map((c) => {
          const isSelected = value.toLowerCase() === c.toLowerCase();
          const isWhite = c.toLowerCase() === '#ffffff';
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`w-full aspect-square rounded-md border p-0.5 transition-all cursor-pointer flex items-center justify-center relative overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-blue-500 border-white scale-105 shadow-md z-10'
                  : isWhite
                    ? 'border-white/60 hover:border-white hover:scale-105'
                    : 'border-white/10 hover:border-white/30 hover:scale-105'
              }`}
              style={{
                colorScheme: 'only light',
                backgroundImage: `linear-gradient(${c}, ${c})`,
              }}
              title={isWhite ? '白色 (#ffffff)' : c}
            >
              {/* Edge/Chrome強制ダークモードによる背景色黒化反転をSVG rectで100%防止 */}
              <svg
                className="w-full h-full rounded-[3px] block pointer-events-none"
                viewBox="0 0 20 20"
                style={{ colorScheme: 'only light' }}
              >
                <rect width="20" height="20" rx="3" fill={c} />
              </svg>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <label
          className="relative w-5 h-5 rounded border border-white/40 cursor-pointer shrink-0 overflow-hidden flex items-center justify-center shadow-xs"
          style={{
            colorScheme: 'only light',
            backgroundImage: `linear-gradient(${normalizedValue}, ${normalizedValue})`,
          }}
          title="カラーピッカーを開く"
        >
          <svg
            className="w-full h-full block pointer-events-none"
            viewBox="0 0 20 20"
            style={{ colorScheme: 'only light' }}
          >
            <rect width="20" height="20" rx="2" fill={normalizedValue} />
          </svg>
          <input
            type="color"
            value={normalizedValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-white/80 focus:outline-none focus:border-blue-500 uppercase"
        />
      </div>
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
      <label className="text-[10px] uppercase tracking-wider text-white/50">
        {label} {value.toFixed(1)}
      </label>
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

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mt-4 py-1.5 rounded-lg border border-red-500/40 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
    >
      <Trash2 size={13} />
      <span>削除</span>
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

  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setConnectingPlayerId = useTacticalUnifiedStore(
    (s) => s.setConnectingPlayerId,
  );
  const isConnecting = connectingPlayerId === player.id;

  const [basicSettingsOpen, setBasicSettingsOpen] = useState(false);
  const [newBadgeText, setNewBadgeText] = useState('');

  // 視野操作
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
          radius: 25,
          color: '#3b82f6',
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

  // バッジ操作
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

  // コネクタ削除操作
  const removeConnectLine = (lineId: string) => {
    up({ connectLines: player.connectLines.filter((l) => l.id !== lineId) });
  };

  const angleDeg = player.visionCone
    ? Math.round((player.visionCone.angleRad * 180) / Math.PI)
    : 0;
  const spreadDeg = player.visionCone
    ? Math.round((player.visionCone.spreadRad * 180) / Math.PI)
    : 60;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-slate-200">
      {/* ── メイン設定 (色・サイズ・枠線太さ) ── */}
      <div className="space-y-3">
        <Row label="色">
          <ColorInput
            value={player.style.color}
            onChange={(v) => upStyle({ color: v })}
          />
        </Row>
        <RangeInput
          label="サイズ"
          value={player.style.sizeScale}
          min={0.4}
          max={2.0}
          step={0.1}
          onChange={(v) => upStyle({ sizeScale: v })}
        />
        <RangeInput
          label="枠線太さ"
          value={player.style.strokeWidth}
          min={0}
          max={5}
          step={0.5}
          onChange={(v) => upStyle({ strokeWidth: v })}
        />
      </div>

      {/* ── オブジェクト ── */}
      <div className="pt-3 border-t border-white/10 space-y-3">
        <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={13} className="text-purple-400" />
          オブジェクト
        </span>

        {/* 矢印クイック追加 */}
        <div className="grid grid-cols-2 gap-1.5">
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
                    x: Math.max(0, Math.min(100, player.x + dir)),
                    y: player.y,
                  },
                ],
                color: player.style.color || '#38bdf8',
                strokeWidth: 3,
                dashArray: [],
                arrowHead: true,
              });
            }}
            className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-all flex items-center justify-center gap-1.5"
            title="選手から実線矢印（パス）を追加"
          >
            <MoveRight size={13} className="text-blue-400" />+ 実線矢印
          </button>

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
                    x: Math.max(0, Math.min(100, player.x + dir)),
                    y: player.y,
                  },
                ],
                color: '#fbbf24',
                strokeWidth: 3,
                dashArray: [6, 4],
                arrowHead: true,
              });
            }}
            className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 hover:text-white transition-all flex items-center justify-center gap-1.5"
            title="選手から点線矢印（移動）を追加"
          >
            <DashedArrowIcon size={13} className="text-amber-400" />+ 点線矢印
          </button>
        </div>

        {/* ── 視野 ── */}
        <div className="space-y-2 pt-1 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/80 flex items-center gap-1.5">
              <Eye size={13} className="text-blue-400" />
              視野
            </span>
            <button
              type="button"
              onClick={toggleVisionCone}
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                hasVisionCone
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/10 text-white/50 hover:text-white'
              }`}
            >
              {hasVisionCone ? 'ON' : 'OFF'}
            </button>
          </div>

          {hasVisionCone && player.visionCone && (
            <div className="space-y-2.5 p-2.5 rounded-lg bg-white/5 border border-white/10">
              <RangeInput
                label="向き (°)"
                value={angleDeg}
                min={0}
                max={360}
                step={5}
                onChange={(deg) =>
                  updateVisionCone({ angleRad: (deg * Math.PI) / 180 })
                }
              />
              <RangeInput
                label="広がり角 (°)"
                value={spreadDeg}
                min={20}
                max={120}
                step={5}
                onChange={(deg) =>
                  updateVisionCone({ spreadRad: (deg * Math.PI) / 180 })
                }
              />
              <RangeInput
                label="視野長"
                value={player.visionCone.radius}
                min={10}
                max={50}
                step={2}
                onChange={(rad) => updateVisionCone({ radius: rad })}
              />
              <Row label="色">
                <ColorInput
                  value={player.visionCone.color}
                  onChange={(c) => updateVisionCone({ color: c })}
                />
              </Row>
              <RangeInput
                label="不透明度"
                value={player.visionCone.opacity}
                min={0.1}
                max={0.8}
                step={0.05}
                onChange={(op) => updateVisionCone({ opacity: op })}
              />
            </div>
          )}
        </div>

        {/* ── コネクタ ── */}
        <div className="space-y-2 pt-1 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/80 flex items-center gap-1.5">
              <Link size={13} className="text-emerald-400" />
              コネクタ
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
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                isConnecting
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400 animate-pulse'
                  : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20'
              }`}
            >
              <Plus size={10} />
              {isConnecting ? '対象選択中...' : '追加'}
            </button>
          </div>

          {/* 接続対象選択案内モード */}
          {isConnecting && (
            <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
              <span className="text-[11px] font-medium leading-tight">
                ピッチ上の対象選手をクリックしてください
              </span>
              <button
                type="button"
                onClick={() => setConnectingPlayerId(null)}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white shrink-0 ml-2"
              >
                キャンセル
              </button>
            </div>
          )}

          {/* 既存コネクタ一覧 */}
          {player.connectLines.length > 0 && (
            <div className="space-y-1.5">
              {player.connectLines.map((line) => {
                const target = allPlayers.find((p) => p.id === line.toPlayerId);
                return (
                  <div
                    key={line.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-xs"
                  >
                    <span className="truncate text-white/80">
                      → {target?.name || `選手 #${target?.shirtNo || '?'}`}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
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
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white/70 hover:text-white"
                        title="線種切替 (実線/点線)"
                      >
                        {line.lineStyle === 'dashed' ? '点線' : '実線'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeConnectLine(line.id)}
                        className="p-1 rounded hover:bg-white/10 text-red-400"
                        title="コネクタを削除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 基本設定 (トグルアコーディオン: デフォルト閉じ) ── */}
      <div className="pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setBasicSettingsOpen((v) => !v)}
          className="flex items-center justify-between w-full py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-white/80 hover:text-white transition-all border border-white/5"
        >
          <span className="flex items-center gap-1.5">
            <Settings size={13} className="text-blue-400" />
            基本設定
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              basicSettingsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {basicSettingsOpen && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-white/[0.03] border border-white/10 space-y-3">
            <Row label="チーム">
              <select
                value={player.team}
                onChange={(e) => up({ team: e.target.value as Player['team'] })}
                className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="home">ホーム</option>
                <option value="away">アウェイ</option>
                <option value="neutral">ニュートラル</option>
              </select>
            </Row>
            <Row label="背番号">
              <TextInput
                value={player.shirtNo ?? ''}
                onChange={(v) => up({ shirtNo: v })}
                maxLength={3}
              />
            </Row>
            <Row label="名前">
              <TextInput
                value={player.name ?? ''}
                onChange={(v) => up({ name: v })}
              />
            </Row>
            <Row label="ポジション">
              <TextInput
                value={player.position ?? ''}
                onChange={(v) => up({ position: v })}
              />
            </Row>
            <Row label="ラベル表示">
              <select
                value={player.style.bottomLabel}
                onChange={(e) =>
                  upStyle({
                    bottomLabel: e.target
                      .value as Player['style']['bottomLabel'],
                  })
                }
                className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="name">名前</option>
                <option value="number">背番号</option>
                <option value="none">非表示</option>
              </select>
            </Row>
            <Row label="内部表示">
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
                <option value="number">背番号</option>
                <option value="photo">写真</option>
                <option value="none">なし</option>
              </select>
            </Row>
            {player.style.insideContent === 'photo' && (
              <Row label="写真URL">
                <TextInput
                  value={player.style.photoUrl ?? ''}
                  onChange={(v) => upStyle({ photoUrl: v })}
                />
              </Row>
            )}

            {/* ── バッジ設定 ── */}
            <div className="pt-2.5 border-t border-white/10 space-y-2">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1">
                <Award size={13} className="text-amber-400" />
                バッジ
              </span>

              {/* 既存バッジ一覧 */}
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
                        className="hover:opacity-70 text-xs leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* プリセットバッジ */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => addBadge('KEY', '#f59e0b', '#000000')}
                  className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30 transition-all"
                >
                  + KEY
                </button>
                <button
                  type="button"
                  onClick={() => addBadge('★', '#eab308', '#000000')}
                  className="px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] font-bold hover:bg-yellow-500/30 transition-all"
                >
                  + ★
                </button>
                <button
                  type="button"
                  onClick={() => addBadge('C', '#3b82f6', '#ffffff')}
                  className="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold hover:bg-blue-500/30 transition-all"
                >
                  + C
                </button>
                <button
                  type="button"
                  onClick={() => addBadge('TARGET', '#ef4444', '#ffffff')}
                  className="px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold hover:bg-red-500/30 transition-all"
                >
                  + TARGET
                </button>
              </div>

              {/* カスタムバッジ追加 */}
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="text"
                  placeholder="カスタムバッジ名"
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
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-medium text-white transition-all"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DeleteButton onClick={onRemove} />
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
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <Row label="色">
        <ColorInput value={arrow.color} onChange={(v) => up({ color: v })} />
      </Row>
      <RangeInput
        label="線の太さ"
        value={arrow.strokeWidth}
        min={1}
        max={10}
        step={0.5}
        onChange={(v) => up({ strokeWidth: v })}
      />
      <Row label="カーブ">
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
            title="直線"
            aria-label="直線"
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
            <span>直線</span>
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
              up({
                curveType: 'curved',
                controlPoint: arrow.controlPoint ?? {
                  x: Math.max(0, Math.min(100, midX + normalX * offset)),
                  y: Math.max(0, Math.min(100, midY + normalY * offset)),
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
            title="カーブ"
            aria-label="カーブ"
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
            <span>カーブ</span>
          </button>
        </div>
      </Row>
      <Row label="種別">
        <select
          value={arrow.arrowType}
          onChange={(e) =>
            up({ arrowType: e.target.value as ArrowAnnotation['arrowType'] })
          }
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="pass">パス</option>
          <option value="move">移動</option>
          <option value="dribble">ドリブル</option>
          <option value="defend">守備</option>
          <option value="run">ラン</option>
          <option value="generic">汎用</option>
        </select>
      </Row>
      <DeleteButton onClick={onRemove} />
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
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      {/* 形状切替 (四角 / 楕円) */}
      {!isPolygon && (
        <Row label="形状">
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
              <span>四角形</span>
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
              <span>楕円</span>
            </button>
          </div>
        </Row>
      )}

      {isPolygon && (
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
          <span className="font-medium">フリーゾーン (多角形)</span>
          <span className="text-[10px] text-emerald-400/70 font-mono">
            {zone.points.length} 頂点
          </span>
        </div>
      )}

      <Row label="塗りつぶし色">
        <ColorInput value={zone.color} onChange={(v) => up({ color: v })} />
      </Row>

      <RangeInput
        label="不透明度"
        value={zone.opacity ?? 0.25}
        min={0.05}
        max={1}
        step={0.05}
        onChange={(v) => up({ opacity: v })}
      />

      <RangeInput
        label="枠線の太さ"
        value={zone.strokeWidth ?? 2}
        min={0}
        max={8}
        step={0.5}
        onChange={(v) => up({ strokeWidth: v })}
      />

      <Row label="枠線の色">
        <ColorInput
          value={zone.strokeColor ?? zone.color}
          onChange={(v) => up({ strokeColor: v })}
        />
      </Row>

      <Row label="種別">
        <select
          value={zone.zoneType}
          onChange={(e) =>
            up({ zoneType: e.target.value as ZoneAnnotation['zoneType'] })
          }
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="highlight">ハイライト</option>
          <option value="space">スペース</option>
          <option value="danger">危険エリア</option>
          <option value="pressing">プレッシング</option>
          <option value="buildup">ビルドアップ</option>
          <option value="generic">汎用</option>
        </select>
      </Row>

      <DeleteButton onClick={onRemove} />
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
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <Row label="テキスト">
        <textarea
          value={text.content}
          maxLength={200}
          onChange={(e) => up({ content: e.target.value })}
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
          rows={3}
        />
      </Row>
      <Row label="色">
        <ColorInput value={text.color} onChange={(v) => up({ color: v })} />
      </Row>
      <RangeInput
        label="フォントサイズ"
        value={text.fontSize}
        min={8}
        max={72}
        step={1}
        onChange={(v) => up({ fontSize: v })}
      />
      <Row label="スタイル">
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
      <DeleteButton onClick={onRemove} />
    </div>
  );
}
