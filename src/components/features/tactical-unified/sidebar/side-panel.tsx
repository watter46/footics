'use client';

/**
 * side-panel.tsx
 * Collapsible left drawer
 * - Layers: アクティブスライドのオブジェクト一覧 (選択可)
 * - Player Palette: D&Dでピッチに投入
 * - Formation Presets: ワンクリックで一括展開
 */

import { ChevronDown, User, X } from 'lucide-react';
import { useState } from 'react';
import type { FormationPreset } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';

interface SidePanelProps {
  open: boolean;
}

// ── フォーメーションプリセット データ ──────────────────────────────────

const FORMATION_PRESETS: FormationPreset[] = [
  {
    name: '4-3-3',
    team: 'home',
    players: [
      { shirtNo: '1', position: 'GK', x: 10, y: 50 },
      { shirtNo: '2', position: 'RB', x: 25, y: 20 },
      { shirtNo: '5', position: 'CB', x: 25, y: 37 },
      { shirtNo: '6', position: 'CB', x: 25, y: 63 },
      { shirtNo: '3', position: 'LB', x: 25, y: 80 },
      { shirtNo: '8', position: 'CM', x: 42, y: 30 },
      { shirtNo: '4', position: 'DM', x: 42, y: 50 },
      { shirtNo: '10', position: 'CM', x: 42, y: 70 },
      { shirtNo: '7', position: 'RW', x: 60, y: 20 },
      { shirtNo: '9', position: 'CF', x: 65, y: 50 },
      { shirtNo: '11', position: 'LW', x: 60, y: 80 },
    ],
  },
  {
    name: '4-4-2',
    team: 'home',
    players: [
      { shirtNo: '1', position: 'GK', x: 10, y: 50 },
      { shirtNo: '2', position: 'RB', x: 25, y: 20 },
      { shirtNo: '5', position: 'CB', x: 25, y: 37 },
      { shirtNo: '6', position: 'CB', x: 25, y: 63 },
      { shirtNo: '3', position: 'LB', x: 25, y: 80 },
      { shirtNo: '7', position: 'RM', x: 45, y: 20 },
      { shirtNo: '8', position: 'CM', x: 45, y: 37 },
      { shirtNo: '4', position: 'CM', x: 45, y: 63 },
      { shirtNo: '11', position: 'LM', x: 45, y: 80 },
      { shirtNo: '9', position: 'CF', x: 63, y: 37 },
      { shirtNo: '10', position: 'CF', x: 63, y: 63 },
    ],
  },
  {
    name: '3-5-2',
    team: 'home',
    players: [
      { shirtNo: '1', position: 'GK', x: 10, y: 50 },
      { shirtNo: '5', position: 'CB', x: 25, y: 30 },
      { shirtNo: '6', position: 'CB', x: 25, y: 50 },
      { shirtNo: '3', position: 'CB', x: 25, y: 70 },
      { shirtNo: '2', position: 'RWB', x: 42, y: 15 },
      { shirtNo: '8', position: 'CM', x: 42, y: 35 },
      { shirtNo: '4', position: 'DM', x: 42, y: 50 },
      { shirtNo: '10', position: 'CM', x: 42, y: 65 },
      { shirtNo: '11', position: 'LWB', x: 42, y: 85 },
      { shirtNo: '9', position: 'CF', x: 62, y: 37 },
      { shirtNo: '7', position: 'CF', x: 62, y: 63 },
    ],
  },
];

// ── Palette ドラッグ用 ─────────────────────────────────────────────

function PaletteDragItem({
  team,
  label,
  color,
}: {
  team: 'home' | 'away' | 'neutral';
  label: string;
  color: string;
}) {
  const addPlayerFromPalette = useTacticalUnifiedStore(
    (s) => s.addPlayerFromPalette,
  );

  function handleDoubleClick() {
    // ダブルクリックでピッチ中央付近に追加
    addPlayerFromPalette(
      team,
      45 + Math.random() * 10,
      35 + Math.random() * 30,
    );
  }

  return (
    <div
      draggable
      onDoubleClick={handleDoubleClick}
      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-white/10 select-none"
      title="ダブルクリックまたはD&Dでピッチへ"
    >
      <div
        className="w-6 h-6 rounded-full border-2 border-white/40 flex items-center justify-center shrink-0"
        style={{ backgroundColor: color }}
      >
        <User size={10} className="text-white" />
      </div>
      <span className="text-xs text-white/70">{label}</span>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────

export function SidePanel({ open }: SidePanelProps) {
  const setSidebarOpen = useTacticalUnifiedStore((s) => s.setSidebarOpen);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const applyFormationPreset = useTacticalUnifiedStore(
    (s) => s.applyFormationPreset,
  );
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const homeColor = useTacticalUnifiedStore((s) => s.project.homeColor.primary);
  const awayColor = useTacticalUnifiedStore((s) => s.project.awayColor.primary);

  const [layersOpen, setLayersOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [formationsOpen, setFormationsOpen] = useState(false);

  return (
    <div className="w-64 shrink-0 h-full flex flex-col bg-[#111] border-r border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <span className="text-xs font-medium text-white/70">パネル</span>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
          aria-label="閉じる"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Layer section */}
        <section>
          <button
            type="button"
            onClick={() => setLayersOpen((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs text-white/60 hover:text-white/90 hover:bg-white/5"
          >
            <span className="font-medium uppercase tracking-wider">
              レイヤー
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform ${layersOpen ? '' : '-rotate-90'}`}
            />
          </button>
          {layersOpen && (
            <ul className="px-2 pb-2 space-y-0.5">
              {activeSlide?.players.map((p) => {
                const isSelected = selectedObjects.some((o) => o.id === p.id);
                return (
                  <li
                    key={p.id}
                    onClick={() => selectObject({ id: p.id, kind: 'player' })}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-white'
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                      style={{ backgroundColor: p.style.color }}
                    />
                    <span className="truncate">
                      {p.name ?? p.shirtNo ?? '選手'}
                    </span>
                    <span className="ml-auto text-[10px] text-white/30">
                      {p.team === 'home' ? 'H' : p.team === 'away' ? 'A' : 'N'}
                    </span>
                  </li>
                );
              })}
              {activeSlide?.arrows.map((a) => (
                <li
                  key={a.id}
                  onClick={() => selectObject({ id: a.id, kind: 'arrow' })}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                    selectedObjects.some((o) => o.id === a.id)
                      ? 'bg-blue-600/20 text-white'
                      : 'text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[10px]">↗</span>
                  <span className="truncate">矢印 ({a.arrowType})</span>
                </li>
              ))}
              {activeSlide?.zones.map((z) => (
                <li
                  key={z.id}
                  onClick={() => selectObject({ id: z.id, kind: 'zone' })}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                    selectedObjects.some((o) => o.id === z.id)
                      ? 'bg-blue-600/20 text-white'
                      : 'text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: z.color }}
                  />
                  <span className="truncate">ゾーン ({z.zoneType})</span>
                </li>
              ))}
              {activeSlide?.texts.map((t) => (
                <li
                  key={t.id}
                  onClick={() => selectObject({ id: t.id, kind: 'text' })}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                    selectedObjects.some((o) => o.id === t.id)
                      ? 'bg-blue-600/20 text-white'
                      : 'text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[10px]">T</span>
                  <span className="truncate">{t.content.slice(0, 16)}</span>
                </li>
              ))}
              {(activeSlide?.players.length ?? 0) === 0 &&
                (activeSlide?.arrows.length ?? 0) === 0 &&
                (activeSlide?.zones.length ?? 0) === 0 &&
                (activeSlide?.texts.length ?? 0) === 0 && (
                  <li className="px-2 py-2 text-[11px] text-white/30 italic">
                    オブジェクトなし
                  </li>
                )}
            </ul>
          )}
        </section>

        {/* Player Palette section */}
        <section className="border-t border-white/10">
          <button
            type="button"
            onClick={() => setPaletteOpen((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs text-white/60 hover:text-white/90 hover:bg-white/5"
          >
            <span className="font-medium uppercase tracking-wider">
              選手パレット
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform ${paletteOpen ? '' : '-rotate-90'}`}
            />
          </button>
          {paletteOpen && (
            <div className="px-1 pb-2">
              <p className="px-2 py-1 text-[10px] text-white/30">
                ダブルクリックでピッチへ追加
              </p>
              <PaletteDragItem
                team="home"
                label="ホーム選手"
                color={homeColor}
              />
              <PaletteDragItem
                team="away"
                label="アウェイ選手"
                color={awayColor}
              />
              <PaletteDragItem
                team="neutral"
                label="汎用選手"
                color="#6b7280"
              />
            </div>
          )}
        </section>

        {/* Formation Presets section */}
        <section className="border-t border-white/10">
          <button
            type="button"
            onClick={() => setFormationsOpen((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs text-white/60 hover:text-white/90 hover:bg-white/5"
          >
            <span className="font-medium uppercase tracking-wider">
              フォーメーション
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform ${formationsOpen ? '' : '-rotate-90'}`}
            />
          </button>
          {formationsOpen && (
            <div className="px-2 pb-2 space-y-1">
              {FORMATION_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() =>
                    applyFormationPreset(
                      { ...preset, team: 'home' },
                      activeSlideId,
                    )
                  }
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors"
                >
                  <span className="font-mono font-bold">{preset.name}</span>
                  <span className="text-[10px] text-white/40">ホーム</span>
                </button>
              ))}
              {FORMATION_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={`away-${preset.name}`}
                  onClick={() =>
                    applyFormationPreset(
                      {
                        ...preset,
                        team: 'away',
                        players: preset.players.map((p) => ({
                          ...p,
                          x: 100 - p.x,
                        })),
                      },
                      activeSlideId,
                    )
                  }
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors"
                >
                  <span className="font-mono font-bold">{preset.name}</span>
                  <span className="text-[10px] text-white/40">アウェイ</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
