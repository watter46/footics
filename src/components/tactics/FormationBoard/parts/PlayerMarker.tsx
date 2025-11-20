'use client';

import type { CSSProperties } from 'react';

import type { TempPlayer } from '@/lib/db';
import { cn } from '@/lib/utils/cn';

const extractLastName = (name?: string | null): string | undefined => {
  if (!name) {
    return undefined;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return undefined;
  }

  const segments = trimmed.split(/[.\s]+/).filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  return segments[segments.length - 1];
};

export type PlayerMarkerVariant = 'default' | 'ghost' | 'substituted';

export interface PlayerMarkerProps {
  player?: Pick<TempPlayer, 'number' | 'name'> | null;
  positionLabel: string;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  actionCount?: number;
  variant?: PlayerMarkerVariant;
}

export const PlayerMarker = ({
  player,
  positionLabel,
  isSelected = false,
  onClick,
  className,
  style,
  actionCount,
  variant = 'default',
}: PlayerMarkerProps) => {
  const jerseyNumber =
    typeof player?.number === 'number' && Number.isFinite(player.number)
      ? `#${player.number}`
      : '-';
  const lastName = extractLastName(player?.name);
  const isGhost = variant === 'ghost';
  const isSubstituted = variant === 'substituted';

     const buttonClassName = cn(
       'relative flex h-10 w-10 items-center justify-center rounded-full border text-center font-semibold shadow-lg transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    isSelected
      ? 'border-sky-400/90 bg-sky-700/80 text-sky-50 focus-visible:ring-sky-300 focus-visible:ring-offset-slate-900'
      : isGhost
        ? 'border-red-500/80 bg-slate-800 text-red-100 focus-visible:ring-red-300 focus-visible:ring-offset-slate-900'
        : isSubstituted
          ? 'border-slate-700 bg-slate-800/70 text-slate-200 focus-visible:ring-slate-400/40 focus-visible:ring-offset-slate-900'
          : 'border-emerald-500/60 bg-emerald-700/80 text-emerald-50 focus-visible:ring-emerald-300 focus-visible:ring-offset-emerald-900'
  );

  const containerClassName = cn(
    'flex flex-col items-center',
    isSubstituted && !isSelected && 'opacity-60',
    className
  );

  return (
    <div className={containerClassName} style={style}>
      <button
        type="button"
        className={buttonClassName}
        onClick={onClick}
        aria-pressed={isSelected}
        disabled={!onClick}
      >
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-100 uppercase">
          {positionLabel}
        </span>
        {actionCount && actionCount > 0 ? (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {actionCount}
          </span>
        ) : null}
        <span className="leading-none text-emerald-50">{jerseyNumber}</span>
      </button>
      <div
        className={cn(
          'mt-1 w-20 text-center text-xs leading-tight font-semibold text-slate-100',
          isSelected && 'text-sky-200',
          isGhost && 'text-red-200',
          isSubstituted && 'text-slate-300'
        )}
      >
        {lastName ?? '---'}
      </div>
    </div>
  );
};
