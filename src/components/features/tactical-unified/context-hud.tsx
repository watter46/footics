'use client';

/**
 * context-hud.tsx
 * Floating Contextual Action Bar (HUD) for selected canvas objects.
 *
 * Provides instant on-pitch editing for:
 *  - Player: shirtNo, fill color, ring/stroke color, circle/ring toggle, delete
 *  - Arrow: stroke width, solid/dash toggle, color, delete
 *  - Zone: color, opacity, delete
 *  - Text: font size, color, delete
 */

import {
  Eye,
  Link,
  Lock,
  Minus,
  MoveRight,
  Plus,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from './canvas/canvas-registry';
import { COLOR_PALETTE } from './common-color-input';

function RingMarkerIcon({ size = 14 }: { size?: number }) {
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
    >
      <ellipse cx="12" cy="12" rx="10" ry="5.5" />
    </svg>
  );
}

function DashedLineIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <line x1="3" y1="12" x2="7" y2="12" />
      <line x1="11" y1="12" x2="15" y2="12" />
      <line x1="19" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function SolidLineIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function DashedArrowIcon({ size = 14 }: { size?: number }) {
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
    >
      <line x1="3" y1="12" x2="6" y2="12" />
      <line x1="10" y1="12" x2="13" y2="12" />
      <line x1="17" y1="12" x2="19" y2="12" />
      <polyline points="15 8 19 12 15 16" />
    </svg>
  );
}

interface MiniColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  title: string;
  isRing?: boolean;
}

function MiniColorPicker({
  value,
  onChange,
  title,
  isRing = false,
}: MiniColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const normalizedValue =
    value?.startsWith('#') && value.length === 7 ? value : '#ffffff';

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={title}
        className={`w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110 shadow-xs flex items-center justify-center shrink-0 ${
          isRing ? 'border-2 border-white/80' : 'border border-white/30'
        }`}
        style={{ backgroundColor: normalizedValue }}
      >
        {isRing && <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="カラーパレット"
          tabIndex={-1}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#1b1b1b] border border-white/20 rounded-xl shadow-2xl z-50 flex flex-col gap-1.5 w-44"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-5 gap-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setIsOpen(false);
                }}
                className={`w-6 h-6 rounded-md border p-0.5 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center ${
                  normalizedValue.toLowerCase() === c.toLowerCase()
                    ? 'ring-2 ring-sky-400 border-white'
                    : 'border-white/10 hover:border-white/30'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/10 px-0.5">
            <span className="text-[10px] text-white/50">カスタム</span>
            <label
              className="relative w-5 h-5 rounded border border-white/30 cursor-pointer overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: normalizedValue }}
              title="カラーピッカー"
            >
              <input
                type="color"
                value={normalizedValue}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export interface ContextHudProps {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function ContextHud({
  stageSize,
  pitchRect,
  nodesRegistryRef,
}: ContextHudProps) {
  const hudRef = useRef<HTMLDivElement>(null);

  const selectedObjects = useTacticalUnifiedStore((s) => s.selectedObjects);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const removePlayer = useTacticalUnifiedStore((s) => s.removePlayer);
  const updateArrow = useTacticalUnifiedStore((s) => s.updateArrow);
  const removeArrow = useTacticalUnifiedStore((s) => s.removeArrow);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setConnectingPlayerId = useTacticalUnifiedStore(
    (s) => s.setConnectingPlayerId,
  );
  const toggleObjectLock = useTacticalUnifiedStore((s) => s.toggleObjectLock);

  // ドラッグ中は直接DOM参照で一時的にHUDを非表示にしてRule 15に適合
  useEffect(() => {
    const stage = nodesRegistryRef?.current?.stage;
    if (!stage) return;
    const handleDragStart = () => {
      if (hudRef.current) hudRef.current.style.opacity = '0';
    };
    const handleDragEnd = () => {
      if (hudRef.current) hudRef.current.style.opacity = '1';
    };
    stage.on('dragstart', handleDragStart);
    stage.on('dragend', handleDragEnd);
    return () => {
      stage.off('dragstart', handleDragStart);
      stage.off('dragend', handleDragEnd);
    };
  }, [nodesRegistryRef]);

  // 単一選択時のみ表示
  if (selectedObjects.length !== 1 || !activeSlide || activeTool === 'eraser') {
    return null;
  }

  const selected = selectedObjects[0];
  const offset = pitchRect ?? {
    x: 0,
    y: 0,
    width: stageSize.width,
    height: stageSize.height,
  };

  let pxX = stageSize.width / 2;
  let pxY = stageSize.height / 2;
  let elementHeight = 40;

  if (selected.kind === 'player') {
    const player = activeSlide.players.find((p) => p.id === selected.id);
    if (!player) return null;

    pxX = offset.x + (player.x / 100) * offset.width;
    pxY = offset.y + (player.y / 100) * offset.height;

    const konvaNode = nodesRegistryRef?.current?.playerNodes.get(player.id);
    if (konvaNode) {
      const pos =
        typeof konvaNode.getAbsolutePosition === 'function'
          ? konvaNode.getAbsolutePosition()
          : konvaNode.position();
      if (
        typeof pos.x === 'number' &&
        typeof pos.y === 'number' &&
        !Number.isNaN(pos.x)
      ) {
        pxX = pos.x;
        pxY = pos.y;
      }
    }

    const baseDim = Math.min(offset.width, offset.height);
    const radius = baseDim * 0.032 * (player.style?.sizeScale ?? 1.0);
    elementHeight = radius * 2;
  } else if (selected.kind === 'arrow') {
    const arrow = activeSlide.arrows.find((a) => a.id === selected.id);
    if (!arrow) return null;

    const konvaEntry = nodesRegistryRef?.current?.arrowNodes.get(arrow.id);
    if (konvaEntry?.node) {
      try {
        const rect = konvaEntry.node.getClientRect();
        pxX = rect.x + rect.width / 2;
        pxY = rect.y;
        elementHeight = rect.height || 20;
      } catch {
        // Fallback below
      }
    } else if (arrow.points && arrow.points.length >= 2) {
      const sX = offset.x + (arrow.points[0].x / 100) * offset.width;
      const sY = offset.y + (arrow.points[0].y / 100) * offset.height;
      const eX = offset.x + (arrow.points[1].x / 100) * offset.width;
      const eY = offset.y + (arrow.points[1].y / 100) * offset.height;
      if (arrow.controlPoint) {
        pxX = offset.x + (arrow.controlPoint.x / 100) * offset.width;
        pxY = offset.y + (arrow.controlPoint.y / 100) * offset.height;
      } else {
        pxX = (sX + eX) / 2;
        pxY = (sY + eY) / 2;
      }
    }
  } else if (selected.kind === 'zone') {
    const zone = activeSlide.zones.find((z) => z.id === selected.id);
    if (!zone) return null;

    const zoneNode = nodesRegistryRef?.current?.zoneNodes.get(zone.id);
    if (zoneNode) {
      try {
        const rect = zoneNode.getClientRect();
        pxX = rect.x + rect.width / 2;
        pxY = rect.y;
        elementHeight = rect.height || 30;
      } catch {
        // Fallback
      }
    } else {
      const normPosX = zone.x ?? zone.points?.[0]?.x ?? 20;
      const normPosY = zone.y ?? zone.points?.[0]?.y ?? 20;
      const normH = zone.height ?? 20;
      pxX = offset.x + (normPosX / 100) * offset.width + 30;
      pxY = offset.y + (normPosY / 100) * offset.height;
      elementHeight = (normH / 100) * offset.height;
    }
  } else if (selected.kind === 'text') {
    const text = activeSlide.texts.find((t) => t.id === selected.id);
    if (!text) return null;

    pxX = offset.x + (text.x / 100) * offset.width;
    pxY = offset.y + (text.y / 100) * offset.height;

    const textNode = nodesRegistryRef?.current?.textNodes.get(text.id);
    if (textNode) {
      try {
        const rect = textNode.getClientRect();
        pxX = rect.x + rect.width / 2;
        pxY = rect.y;
        elementHeight = rect.height || 24;
      } catch {
        // Fallback
      }
    }
  } else if (selected.kind === 'ball') {
    const ball = activeSlide.ball;
    pxX = offset.x + (ball.x / 100) * offset.width;
    pxY = offset.y + (ball.y / 100) * offset.height;

    const ballNode = nodesRegistryRef?.current?.ballNode;
    if (ballNode) {
      const pos =
        typeof ballNode.getAbsolutePosition === 'function'
          ? ballNode.getAbsolutePosition()
          : ballNode.position();
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        pxX = pos.x;
        pxY = pos.y;
      }
    }
    elementHeight = 24;
  } else {
    return null;
  }

  // 画面端からの余裕を持たせたクランプ計算
  const clampedX = Math.max(120, Math.min(stageSize.width - 120, pxX));
  const isTooCloseToTop = pxY - elementHeight / 2 - 50 < 10;
  const isBelow = isTooCloseToTop;
  const clampedY = isBelow
    ? pxY + elementHeight / 2 + 12
    : pxY - elementHeight / 2 - 12;

  return (
    <div
      ref={hudRef}
      role="toolbar"
      aria-label="コンテキスト操作ツールバー"
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        transform: isBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      }}
      className="absolute z-40 transition-opacity duration-150 select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-900/90 backdrop-blur-md border border-white/15 shadow-2xl shadow-black/80 text-xs text-white">
        {/* ── 選手HUD ── */}
        {selected.kind === 'player' &&
          (() => {
            const player = activeSlide.players.find(
              (p) => p.id === selected.id,
            );
            if (!player) return null;

            const isRing = player.style?.markerType === 'ring';
            const currentScale = player.style?.sizeScale ?? 1.0;
            const hasVisionCone = player.visionCone?.visible ?? false;
            const hasFocus = player.focus?.enabled ?? false;
            const isConnecting = connectingPlayerId === player.id;

            return (
              <>
                {/* 1. 背番号入力 (サークルマーカー時のみ表示) */}
                {!isRing && (
                  <>
                    <div className="flex items-center bg-white/10 rounded-md px-1.5 py-0.5 text-xs text-white">
                      <span className="text-white/40 font-semibold text-[10px] select-none mr-1">
                        #
                      </span>
                      <input
                        type="text"
                        value={player.shirtNo ?? ''}
                        onChange={(e) => {
                          updatePlayer(activeSlideId, player.id, {
                            shirtNo: e.target.value,
                          });
                        }}
                        className="w-6 bg-transparent text-white font-mono text-xs text-center focus:outline-none focus:bg-white/10 rounded"
                        maxLength={3}
                        placeholder="-"
                        title="背番号"
                        aria-label="背番号"
                      />
                    </div>
                    <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />
                  </>
                )}

                {/* 2. メインカラー (サークル/リング共通) */}
                <MiniColorPicker
                  value={player.style?.color ?? '#ef4444'}
                  onChange={(color) => {
                    updatePlayer(activeSlideId, player.id, {
                      style: { ...player.style, color },
                    });
                  }}
                  title="メインカラー"
                />

                {/* 3. 枠線/リングカラー (サークルマーカー時のみ表示) */}
                {!isRing && (
                  <MiniColorPicker
                    value={player.style?.strokeColor ?? '#ffffff'}
                    onChange={(strokeColor) => {
                      updatePlayer(activeSlideId, player.id, {
                        style: { ...player.style, strokeColor },
                      });
                    }}
                    title="枠線カラー"
                    isRing
                  />
                )}

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 4. スケール変更 (縮小 / 拡大) */}
                <div className="flex items-center bg-white/10 rounded-md px-1 py-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(
                        0.6,
                        Number((currentScale - 0.1).toFixed(1)),
                      );
                      updatePlayer(activeSlideId, player.id, {
                        style: { ...player.style, sizeScale: next },
                      });
                    }}
                    className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="マーカースケール縮小 (-0.1)"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="text-[10px] font-mono text-white/90 px-0.5 select-none">
                    {currentScale.toFixed(1)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(
                        2.0,
                        Number((currentScale + 0.1).toFixed(1)),
                      );
                      updatePlayer(activeSlideId, player.id, {
                        style: { ...player.style, sizeScale: next },
                      });
                    }}
                    className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="マーカースケール拡大 (+0.1)"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 5. マーカーオプション群 */}
                {/* 5a. Vision Cone */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVisible = !hasVisionCone;
                    updatePlayer(activeSlideId, player.id, {
                      visionCone: {
                        id: player.visionCone?.id ?? crypto.randomUUID(),
                        angleRad: player.visionCone?.angleRad ?? 0,
                        spreadRad:
                          player.visionCone?.spreadRad ?? (60 * Math.PI) / 180,
                        radius: player.visionCone?.radius ?? 13,
                        color:
                          player.visionCone?.color ??
                          player.style?.color ??
                          '#38bdf8',
                        opacity: player.visionCone?.opacity ?? 0.25,
                        visible: nextVisible,
                      },
                    });
                  }}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    hasVisionCone
                      ? 'text-sky-400 bg-sky-500/20'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title={
                    hasVisionCone
                      ? '視野コーンON (クリックでOFF)'
                      : '視野コーンを追加'
                  }
                >
                  <Eye size={13} />
                </button>

                {/* 5b. Connect Line */}
                <button
                  type="button"
                  onClick={() => {
                    if (isConnecting) {
                      setConnectingPlayerId(null);
                    } else {
                      setConnectingPlayerId(player.id);
                    }
                  }}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    isConnecting
                      ? 'text-emerald-400 bg-emerald-500/30 animate-pulse'
                      : player.connectLines?.length > 0
                        ? 'text-emerald-400 bg-emerald-500/20'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title={
                    isConnecting
                      ? '対象選手を選択中 (クリックでキャンセル)'
                      : 'コネクトラインを追加 (クリック後に対象選手を選択)'
                  }
                >
                  <Link size={13} />
                </button>

                {/* 5c. Solid Arrow */}
                <button
                  type="button"
                  onClick={() => {
                    const dir = player.team === 'away' ? -15 : 15;
                    addArrow(activeSlideId, {
                      id: crypto.randomUUID(),
                      annotationType: 'arrow',
                      arrowType: 'pass',
                      curveType: 'straight',
                      sourcePlayerId: player.id,
                      points: [
                        { x: player.x, y: player.y },
                        { x: player.x + dir, y: player.y },
                      ],
                      color: player.style?.color || '#38bdf8',
                      strokeWidth: 3,
                      dashArray: [],
                      arrowHead: true,
                      endMarker: 'arrow',
                    });
                  }}
                  className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="実線矢印を追加 (パス/シュート)"
                >
                  <MoveRight size={13} />
                </button>

                {/* 5d. Dashed Arrow */}
                <button
                  type="button"
                  onClick={() => {
                    const dir = player.team === 'away' ? -15 : 15;
                    addArrow(activeSlideId, {
                      id: crypto.randomUUID(),
                      annotationType: 'arrow',
                      arrowType: 'move',
                      curveType: 'straight',
                      sourcePlayerId: player.id,
                      points: [
                        { x: player.x, y: player.y },
                        { x: player.x + dir, y: player.y },
                      ],
                      color: '#ffffff',
                      strokeWidth: 3,
                      dashArray: [6, 4],
                      arrowHead: true,
                      endMarker: 'arrow',
                    });
                  }}
                  className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="点線矢印を追加 (フリーラン/移動)"
                >
                  <DashedArrowIcon size={13} />
                </button>

                {/* 5e. Focus / Spotlight */}
                <button
                  type="button"
                  onClick={() => {
                    const nextEnabled = !hasFocus;
                    updatePlayer(activeSlideId, player.id, {
                      focus: {
                        enabled: nextEnabled,
                        color: player.focus?.color ?? '#ffffff',
                        radius: player.focus?.radius ?? 3,
                        opacity: player.focus?.opacity ?? 0.35,
                        style: player.focus?.style ?? 'spotlight',
                      },
                    });
                  }}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    hasFocus
                      ? 'text-yellow-400 bg-yellow-500/20'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title={
                    hasFocus
                      ? 'スポットライトON (クリックでOFF)'
                      : 'スポットライトを追加'
                  }
                >
                  <Sparkles size={13} />
                </button>

                {/* 6. マーカー形状切替 (サークルマーカー時のみ表示) */}
                {!isRing && (
                  <>
                    <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />
                    <button
                      type="button"
                      onClick={() => {
                        updatePlayer(activeSlideId, player.id, {
                          style: { ...player.style, markerType: 'ring' },
                        });
                      }}
                      className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="3Dリングへ切替"
                    >
                      <RingMarkerIcon size={14} />
                    </button>
                  </>
                )}

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* ロック / ロック解除 */}
                <button
                  type="button"
                  onClick={() => toggleObjectLock(player.id, 'player')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    player.locked
                      ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={player.locked ? 'ロック解除' : 'ロック (固定)'}
                >
                  {player.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 7. 削除ボタン */}
                <button
                  type="button"
                  onClick={() => {
                    removePlayer(activeSlideId, player.id);
                    clearSelection();
                  }}
                  className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  title="削除 (Delete)"
                >
                  <Trash2 size={13} />
                </button>
              </>
            );
          })()}

        {/* ── 矢印/ラインHUD ── */}
        {selected.kind === 'arrow' &&
          (() => {
            const arrow = activeSlide.arrows.find((a) => a.id === selected.id);
            if (!arrow) return null;

            const isDashed = arrow.dashArray && arrow.dashArray.length > 0;

            return (
              <>
                {/* 実線 / 点線 切替 */}
                <button
                  type="button"
                  onClick={() => {
                    updateArrow(activeSlideId, arrow.id, {
                      dashArray: isDashed ? [] : [6, 4],
                    });
                  }}
                  className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isDashed ? '点線 (実線に切替)' : '実線 (点線に切替)'}
                >
                  {isDashed ? (
                    <DashedLineIcon size={14} />
                  ) : (
                    <SolidLineIcon size={14} />
                  )}
                </button>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 線の太さ */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = arrow.strokeWidth ?? 3;
                      if (cur > 1) {
                        updateArrow(activeSlideId, arrow.id, {
                          strokeWidth: cur - 1,
                        });
                      }
                    }}
                    disabled={(arrow.strokeWidth ?? 3) <= 1}
                    className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="線を細く"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="text-[11px] font-mono text-white/90 min-w-[20px] text-center">
                    {arrow.strokeWidth ?? 3}px
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = arrow.strokeWidth ?? 3;
                      if (cur < 10) {
                        updateArrow(activeSlideId, arrow.id, {
                          strokeWidth: cur + 1,
                        });
                      }
                    }}
                    disabled={(arrow.strokeWidth ?? 3) >= 10}
                    className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="線を太く"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 線の色 */}
                <MiniColorPicker
                  value={arrow.color ?? '#ffffff'}
                  onChange={(color) => {
                    updateArrow(activeSlideId, arrow.id, { color });
                  }}
                  title="線の色"
                />

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* ロック / ロック解除 */}
                <button
                  type="button"
                  onClick={() => toggleObjectLock(arrow.id, 'arrow')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    arrow.locked
                      ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={arrow.locked ? 'ロック解除' : 'ロック (固定)'}
                >
                  {arrow.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => {
                    removeArrow(activeSlideId, arrow.id);
                    clearSelection();
                  }}
                  className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  title="削除 (Delete)"
                >
                  <Trash2 size={13} />
                </button>
              </>
            );
          })()}

        {/* ── ゾーンHUD ── */}
        {selected.kind === 'zone' &&
          (() => {
            const zone = activeSlide.zones.find((z) => z.id === selected.id);
            if (!zone) return null;

            return (
              <>
                {/* ゾーン色 */}
                <MiniColorPicker
                  value={zone.color ?? '#f59e0b'}
                  onChange={(color) => {
                    updateZone(activeSlideId, zone.id, { color });
                  }}
                  title="ゾーンの色"
                />

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 不透明度切替 */}
                <button
                  type="button"
                  onClick={() => {
                    const cur = zone.opacity ?? 0.25;
                    const next =
                      cur < 0.25
                        ? 0.35
                        : cur < 0.45
                          ? 0.6
                          : cur < 0.7
                            ? 0.15
                            : 0.25;
                    updateZone(activeSlideId, zone.id, { opacity: next });
                  }}
                  className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer font-mono"
                  title="不透明度 (クリックで切替)"
                >
                  {Math.round((zone.opacity ?? 0.25) * 100)}%
                </button>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* ロック / ロック解除 */}
                <button
                  type="button"
                  onClick={() => toggleObjectLock(zone.id, 'zone')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    zone.locked
                      ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={zone.locked ? 'ロック解除' : 'ロック (固定)'}
                >
                  {zone.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => {
                    removeZone(activeSlideId, zone.id);
                    clearSelection();
                  }}
                  className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  title="削除 (Delete)"
                >
                  <Trash2 size={13} />
                </button>
              </>
            );
          })()}

        {/* ── テキストHUD ── */}
        {selected.kind === 'text' &&
          (() => {
            const text = activeSlide.texts.find((t) => t.id === selected.id);
            if (!text) return null;

            return (
              <>
                {/* 文字サイズ */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = text.fontSize ?? 16;
                      if (cur > 10) {
                        updateText(activeSlideId, text.id, {
                          fontSize: cur - 2,
                        });
                      }
                    }}
                    disabled={(text.fontSize ?? 16) <= 10}
                    className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="文字を小さく"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="text-[11px] font-mono text-white/90 min-w-[24px] text-center">
                    {text.fontSize ?? 16}px
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = text.fontSize ?? 16;
                      if (cur < 64) {
                        updateText(activeSlideId, text.id, {
                          fontSize: cur + 2,
                        });
                      }
                    }}
                    disabled={(text.fontSize ?? 16) >= 64}
                    className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="文字を大きく"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 文字色 */}
                <MiniColorPicker
                  value={text.color ?? '#ffffff'}
                  onChange={(color) => {
                    updateText(activeSlideId, text.id, { color });
                  }}
                  title="文字色"
                />

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* ロック / ロック解除 */}
                <button
                  type="button"
                  onClick={() => toggleObjectLock(text.id, 'text')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    text.locked
                      ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={text.locked ? 'ロック解除' : 'ロック (固定)'}
                >
                  {text.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>

                <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

                {/* 削除ボタン */}
                <button
                  type="button"
                  onClick={() => {
                    removeText(activeSlideId, text.id);
                    clearSelection();
                  }}
                  className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                  title="削除 (Delete)"
                >
                  <Trash2 size={13} />
                </button>
              </>
            );
          })()}

        {/* ── ボールHUD ── */}
        {selected.kind === 'ball' &&
          (() => {
            const ball = activeSlide.ball;
            return (
              <>
                <button
                  type="button"
                  onClick={() => toggleObjectLock('ball', 'ball')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    ball.locked
                      ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={
                    ball.locked ? 'ボールのロック解除' : 'ボールをロック (固定)'
                  }
                >
                  {ball.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
              </>
            );
          })()}
      </div>
    </div>
  );
}
