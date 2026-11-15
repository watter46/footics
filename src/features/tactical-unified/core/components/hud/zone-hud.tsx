'use client';

import { Circle, Lock, Square, Trash2, Unlock } from 'lucide-react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';
import { MiniColorPicker } from './mini-color-picker';
import { ZoneStrokePopover } from './zone-stroke-popover';

const Divider = () => (
  <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />
);

export interface ZoneHudProps {
  zoneId: string;
}

export function ZoneHud({ zoneId }: ZoneHudProps) {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const clearSelection = useSessionStore((s) => s.clearSelection);

  const zone = activeSlide?.zones.find((z) => z.id === zoneId);

  if (!zone || !activePhaseId || !activeSlideId) return null;

  const updateZone = (id: string, patch: Partial<DomainZoneAnnotation>) => {
    dispatchSlide(activePhaseId, activeSlideId, {
      type: 'UPDATE_ZONE',
      id,
      patch,
    });
  };

  const isPolygon = zone.shapeType === 'polygon';

  return (
    <>
      {/* 形状切替 (四角形 ↔ 円/楕円) */}
      {!isPolygon && (
        <>
          <button
            type="button"
            onClick={() =>
              updateZone(zone.id, {
                shapeType: zone.shapeType === 'ellipse' ? 'rect' : 'ellipse',
              })
            }
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={
              zone.shapeType === 'ellipse'
                ? '円/楕円 (四角形に切替)'
                : '四角形 (円/楕円に切替)'
            }
          >
            {zone.shapeType === 'ellipse' ? (
              <Circle size={14} />
            ) : (
              <Square size={14} />
            )}
          </button>
          <Divider />
        </>
      )}

      {/* ゾーン色 */}
      <MiniColorPicker
        value={zone.color ?? '#ef4444'}
        onChange={(color) => updateZone(zone.id, { color })}
        title="ゾーンの色"
      />

      <Divider />

      {/* 不透明度切替 (塗り) */}
      <button
        type="button"
        onClick={() => {
          const cur = zone.opacity ?? 0.25;
          const next =
            cur < 0.25 ? 0.35 : cur < 0.45 ? 0.6 : cur < 0.7 ? 0.15 : 0.25;
          updateZone(zone.id, { opacity: next });
        }}
        style={{ backgroundColor: '#222226', color: '#ffffff' }}
        className="px-1.5 py-0.5 rounded bg-[#222226] border border-white/[0.08] text-[11px] text-white/80 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer font-mono"
        title="塗りの不透明度 (クリックで切替)"
      >
        {Math.round((zone.opacity ?? 0.25) * 100)}%
      </button>

      <Divider />

      {/* 枠線専用ポップオーバー (太さ・色・不透明度) */}
      <ZoneStrokePopover zone={zone} updateZone={updateZone} />

      <Divider />

      {/* ロック / ロック解除 */}
      <button
        type="button"
        onClick={() =>
          dispatchSlide(activePhaseId, activeSlideId, {
            type: 'TOGGLE_ENTITY_LOCK',
            id: zone.id,
            kind: 'zone',
          })
        }
        style={
          zone.locked
            ? { backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }
            : undefined
        }
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          zone.locked
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/80 hover:text-white hover:bg-white/[0.08]'
        }`}
        title={zone.locked ? 'ロック解除' : 'ロック (固定)'}
      >
        {zone.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      <Divider />

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => {
          dispatchSlide(activePhaseId, activeSlideId, {
            type: 'REMOVE_ZONE',
            id: zone.id,
          });
          clearSelection();
        }}
        className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
        title="削除 (Delete)"
      >
        <Trash2 size={13} />
      </button>
    </>
  );
}
