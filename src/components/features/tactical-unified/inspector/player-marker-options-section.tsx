'use client';

import {
  Award,
  Circle,
  Eye,
  Hash,
  Image as ImageIcon,
  Link,
  MoveRight,
  Pipette,
  Plus,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import {
  type MarkerOptionTab,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';
import { ColorInput } from '../common-color-input';
import {
  DashedArrowIcon,
  RangeInput,
  Row,
  TextInput,
} from './inspector-shared-controls';

export function PlayerMarkerOptionsSection({
  player,
  allPlayers,
  slideId,
  updatePlayer,
  addArrow,
  newBadgeText,
  setNewBadgeText,
}: {
  player: Player;
  allPlayers: Player[];
  slideId: string;
  updatePlayer: (s: string, id: string, p: Partial<Player>) => void;
  addArrow: (s: string, arrow: ArrowAnnotation) => void;
  newBadgeText: string;
  setNewBadgeText: (s: string) => void;
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
  const isConnecting = connectingPlayerId === player.id;

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
    <>
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
                  color: '#ffffff',
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
    </>
  );
}
