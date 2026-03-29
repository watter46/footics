"use client";

/**
 * EventTimeline — @tanstack/react-virtual による仮想スクロールテーブル
 *
 * 設計:
 * - 数千件のイベントを仮想スクロールで高速描画。DOM上には表示行＋バッファのみ。
 * - ヘッダーは sticky で固定。
 * - ページネーション廃止 → 全件仮想スクロール。
 */
import { useRef, useMemo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { eventStrategies } from "@/registry";
import type { EventRow, MatchMetadata } from "@/types";
import { getEventMetadata } from "@/lib/event-definitions";

// ── Props ──

interface EventTimelineProps {
  events: EventRow[];
  totalCount: number;
  isQuerying: boolean;
  metadata: MatchMetadata;
  activeStrategies: Set<string>;
  highlightEventId?: string | null;
  onEditCustomEvent?: (event: EventRow) => void;
  onDeleteCustomEvent?: (eventId: string) => void;
}

// ── Constants ──

const ROW_HEIGHT = 44;
const OVERSCAN = 15;

// ── Helpers ──

function formatTime(row: EventRow): string {
  const period = Number(row.period);
  const min = Number(row.minute);
  const expMin = Number(row.expanded_minute);
  const sec = Number(row.second);

  const isStoppage =
    (period === 1 && min === 45 && expMin > 45) ||
    (period === 2 && min === 90 && expMin > 90);

  if (isStoppage) {
    const addedMin = expMin - min;
    return `${String(min).padStart(2, "0")}(+${String(addedMin).padStart(2, "0")}:${String(sec).padStart(2, "0")})`;
  }
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── Component ──

export function EventTimeline({
  events,
  totalCount,
  isQuerying,
  metadata,
  activeStrategies,
  highlightEventId,
  onEditCustomEvent,
  onDeleteCustomEvent,
}: EventTimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { playerIdNameDictionary, teams } = metadata;

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  useEffect(() => {
    if (highlightEventId && events.length > 0) {
      const idx = events.findIndex(e => e.id.toString() === highlightEventId);
      if (idx !== -1) {
        // give it a tiny delay to ensure rendering matches state before scrolling
        setTimeout(() => {
          virtualizer.scrollToIndex(idx, { align: "center" });
        }, 50);
      }
    }
  }, [highlightEventId, events, virtualizer]);

  // Pre-compute active strategy list for matching
  const activeStrategyList = useMemo(
    () => eventStrategies.filter((s) => activeStrategies.has(s.id)),
    [activeStrategies]
  );

  const selectedTeamName = "";

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-slate-950 to-emerald-900/10 pointer-events-none" />

      {/* Header */}
      <header className="mb-6 relative z-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-white mb-1">
            Timeline{" "}
            {selectedTeamName && (
              <span className="text-slate-400 font-medium">({selectedTeamName})</span>
            )}
          </h2>
          <p className="text-slate-400 text-sm">
            {isQuerying ? (
              <span className="text-blue-400 animate-pulse">Querying...</span>
            ) : (
              `Showing ${events.length} of ${totalCount} events`
            )}
          </p>
        </div>
      </header>

      {/* Table */}
      <Card className="flex-1 flex flex-col overflow-hidden bg-slate-900/80 border-slate-800 backdrop-blur-xl relative z-10 shadow-2xl">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          {/* Sticky header */}
          <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center h-10 px-4">
              <div className="w-28 text-slate-400 font-medium tracking-wider text-xs uppercase">
                Time
              </div>
              <div className="flex-1 text-slate-400 font-medium tracking-wider text-xs uppercase">
                Player
              </div>
              <div className="w-32 text-slate-400 font-medium tracking-wider text-xs uppercase">
                Team
              </div>
              <div className="w-40 text-slate-400 font-medium tracking-wider text-xs uppercase">
                Event Type
              </div>
              <div className="w-40 text-slate-400 font-medium tracking-wider text-xs uppercase">
                Scopes
              </div>
              <div className="w-24 text-slate-400 font-medium tracking-wider text-xs uppercase">
                Outcome
              </div>
            </div>
          </div>

          {/* Virtual scroll container */}
          <div ref={parentRef} className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                No events found for given filters.
              </div>
            ) : (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const event = events[virtualRow.index];
                  const isHome = Number(event.team_id) === teams.home.teamId;
                  const timeString = formatTime(event);

                  const matchedStrategies = activeStrategyList.filter(
                    (s) =>
                      event[`is_strategy_${s.id.replace(/-/g, "_")}`] === true
                  );

                  if (event.source === 'custom') {
                    const isHighlighted = highlightEventId === event.id.toString();

                    return (
                      <div
                        key={`custom-${event.id}-${virtualRow.index}`}
                        data-index={virtualRow.index}
                        className={`flex items-center px-4 border-b border-amber-900/30 transition-colors ${
                          isHighlighted ? "bg-amber-700/50 blink-shadow" : "bg-amber-950/20 hover:bg-amber-900/30"
                        }`}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <div className="w-28 font-mono text-amber-500/80 text-sm">
                          {timeString}
                        </div>
                        <div className="flex-1 flex items-center gap-2 pr-10 overflow-hidden">
                          <div className="flex gap-1 flex-wrap shrink-0">
                            {(event.custom_label || "").split(" / ").filter(Boolean).map((lbl, i) => {
                              const meta = getEventMetadata(lbl);
                              return (
                                <Badge 
                                  key={i} 
                                  className="border font-bold px-2 py-0.5 rounded shadow-none text-[10px] uppercase tracking-wider whitespace-nowrap text-white"
                                  style={{ 
                                    backgroundColor: (meta?.groupColor ?? "#8E8E93") + "33", 
                                    borderColor: meta?.groupColor ?? "#8E8E93",
                                    color: meta?.groupColor ?? "#ffffff"
                                  }}
                                >
                                  {lbl}
                                </Badge>
                              );
                            })}
                          </div>
                          <span className="text-amber-100/90 text-sm font-medium leading-relaxed truncate">{event.custom_memo}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-4 shrink-0">
                          <button
                            onClick={() => onEditCustomEvent?.(event)}
                            className="p-1.5 text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                            title="Edit Event"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteCustomEvent?.(event.id.toString())}
                            className="p-1.5 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${event.id}-${virtualRow.index}`}
                      data-index={virtualRow.index}
                      className="flex items-center px-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {/* Time */}
                      <div className="w-28 font-mono text-slate-300 text-sm">
                        {timeString}
                      </div>

                      {/* Player */}
                      <div className="flex-1 font-medium text-slate-200 text-sm truncate">
                        {(() => {
                          if (!event.player_id) return <span className="text-slate-600">Team Event</span>;
                          const pidStr = event.player_id.toString().split('.')[0];
                          const name = playerIdNameDictionary[pidStr];
                          return name || <span className="text-slate-600">Team Event ({pidStr})</span>;
                        })()}
                      </div>

                      {/* Team */}
                      <div className="w-32">
                        <Badge
                          variant="outline"
                          className={`border-0 bg-opacity-15 font-semibold text-xs ${
                            isHome
                              ? "bg-blue-500 text-blue-400"
                              : "bg-emerald-500 text-emerald-400"
                          }`}
                        >
                          {isHome ? teams.home.name : teams.away.name}
                        </Badge>
                      </div>

                      {/* Event Type */}
                      <div className="w-40 text-sm">
                        <span>{event.type_name}</span>
                        {event.is_shot && (
                          <Badge className="ml-1.5 bg-red-900/50 text-red-400 hover:bg-red-900/50 text-xs">
                            Shot
                          </Badge>
                        )}
                        {event.is_goal && (
                          <Badge className="ml-1.5 bg-yellow-600 text-yellow-100 hover:bg-yellow-600 text-xs">
                            Goal
                          </Badge>
                        )}
                      </div>

                      {/* Scopes */}
                      <div className="w-40">
                        <div className="flex flex-wrap gap-1">
                          {matchedStrategies.map((s) => (
                            <Badge
                              key={s.id}
                              className={`${s.color} border-0 px-2 py-0.5 text-xs font-semibold shadow-none opacity-90`}
                            >
                              {s.label}
                            </Badge>
                          ))}
                          {matchedStrategies.length === 0 && (
                            <span className="text-slate-600">-</span>
                          )}
                        </div>
                      </div>

                      {/* Outcome */}
                      <div className="w-24">
                        <div
                          className={`flex items-center gap-1.5 text-sm ${
                            event.outcome
                              ? "text-green-500"
                              : "text-red-500/80"
                          }`}
                        >
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              event.outcome ? "bg-green-500" : "bg-red-500/80"
                            }`}
                          />
                          {event.outcome ? "Success" : "Fail"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
