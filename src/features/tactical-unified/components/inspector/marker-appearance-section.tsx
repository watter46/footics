'use client';

import { Circle, Hash, Image as ImageIcon, Tag, User } from 'lucide-react';
import type { Player } from '@/lib/types/tactical-unified';
import { Row, TextInput } from './inspector-shared-controls';

export interface MarkerAppearanceSectionProps {
  player: Player;
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
}

export function MarkerAppearanceSection({
  player,
  slideId,
  updatePlayer,
}: MarkerAppearanceSectionProps) {
  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);
  const upStyle = (s: Partial<Player['style']>) =>
    up({ style: { ...player.style, ...s } });

  return (
    <div className="space-y-3.5">
      {/* Card: Inside Content (Marker Visual Center) */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
        <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <Tag size={13} className="text-amber-400" />
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
    </div>
  );
}
