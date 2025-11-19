'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { calculateDisplayTime, getPhaseDisplay } from '@/lib/utils/timer';
import {
  useTimerStore,
  type TimerPhase,
} from '@/features/timer/stores/timer-store';
import { useTimerTick } from '@/features/timer/hooks/use-timer-tick';

const PHASE_OPTIONS: Array<{ value: TimerPhase; label: string }> = [
  { value: 'first-half', label: '1st' },
  { value: 'second-half', label: '2nd' },
  { value: 'extra-first', label: 'ET 1st' },
  { value: 'extra-second', label: 'ET 2nd' },
  { value: 'penalty', label: 'PK' },
];

export const Timer = () => {
  useTimerTick();

  const elapsedSeconds = useTimerStore(state => state.elapsedSeconds);
  const phase = useTimerStore(state => state.phase);
  const isRunning = useTimerStore(state => state.isRunning);
  const stoppageSeconds = useTimerStore(state => state.stoppageSeconds);
  const start = useTimerStore(state => state.start);
  const pause = useTimerStore(state => state.pause);
  const reset = useTimerStore(state => state.reset);
  const switchToPhase = useTimerStore(state => state.switchToPhase);
  const adjustTime = useTimerStore(state => state.adjustTime);

  const [isExpanded, setIsExpanded] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        widgetRef.current &&
        !widgetRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  const { main, stoppage } = calculateDisplayTime(
    elapsedSeconds,
    phase,
    stoppageSeconds
  );

  const handleTogglePlay = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handlePhaseChange = useCallback(
    (newPhase: TimerPhase) => {
      switchToPhase(newPhase);
    },
    [switchToPhase]
  );

  const handleTimeAdjust = useCallback(
    (seconds: number) => {
      adjustTime(seconds);
    },
    [adjustTime]
  );

  const phaseColor = () => {
    switch (phase) {
      case 'first-half':
        return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
      case 'second-half':
        return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
      case 'extra-first':
      case 'extra-second':
        return 'bg-purple-500/20 text-purple-200 border-purple-500/40';
      case 'penalty':
        return 'bg-orange-500/20 text-orange-200 border-orange-500/40';
      default:
        return 'bg-sky-500/20 text-sky-200 border-sky-500/40';
    }
  };

  return (
    <div
      ref={widgetRef}
      className="fixed top-20 right-3 z-50 flex flex-col sm:right-6"
    >
      {/* Timer Display */}
      <button
        type="button"
        onClick={handleToggleExpand}
        aria-expanded={isExpanded}
        className={cn(
          'bg-card/95 text-foreground focus-visible:ring-primary/50 relative flex flex-col items-center gap-3 rounded-t-2xl border border-white/10 px-4 py-3 text-left shadow-[0_20px_65px_rgba(0,0,0,0.55)] backdrop-blur-lg focus:outline-none focus-visible:ring-2',
          !isExpanded &&
            'hover:border-primary/50 cursor-pointer rounded-2xl active:scale-95',
          isExpanded && 'border-b-0'
        )}
      >
        <Badge
          variant="outline"
          className={cn(
            'absolute top-2 left-2 px-1.5 py-0 text-[10px]',
            phaseColor()
          )}
        >
          {getPhaseDisplay(phase)}
        </Badge>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-foreground font-mono text-2xl font-semibold tabular-nums">
            {main}
          </span>
          {stoppage ? (
            <span className="font-mono text-sm font-medium text-rose-300">
              {stoppage}
            </span>
          ) : null}
        </div>
      </button>

      {/* Expanded Controls */}
      {isExpanded && (
        <div
          className={cn(
            'bg-card/95 flex flex-col overflow-hidden border border-t-0 border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur-lg',
            'rounded-b-2xl'
          )}
        >
          {/* Control Buttons (横拡張メニュー) */}
          <div className="flex items-center justify-evenly gap-2 border-b border-white/10 px-3 py-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              className="h-8 w-8 p-0"
              title="リセット"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleTogglePlay}
              className="h-8 w-8 p-0"
              title={isRunning ? '一時停止' : '再生'}
            >
              {isRunning ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Phase & Time Controls (縦拡張メニュー) */}
          <div className="flex flex-col items-center gap-3 p-3">
            {/* Phase Controls */}
            <div className="w-full space-y-2">
              <div className="text-muted-foreground text-center text-xs font-semibold tracking-wide uppercase">
                Phase
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PHASE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handlePhaseChange(option.value)}
                    className={cn(
                      'rounded-2xl border px-2 py-1.5 text-xs font-medium transition-colors',
                      phase === option.value
                        ? 'border-primary/60 bg-primary/15 text-foreground'
                        : 'text-foreground/70 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Adjustment Controls */}
            <div className="w-full space-y-2">
              <div className="text-muted-foreground text-center text-xs font-semibold tracking-wide uppercase">
                Time
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleTimeAdjust(-30)}
                  className="text-foreground/80 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium transition-colors hover:border-white/20 hover:bg-white/10"
                  title="-30秒"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleTimeAdjust(-5)}
                  className="text-foreground/80 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium transition-colors hover:border-white/20 hover:bg-white/10"
                  title="-5秒"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleTimeAdjust(5)}
                  className="text-foreground/80 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium transition-colors hover:border-white/20 hover:bg-white/10"
                  title="+5秒"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleTimeAdjust(30)}
                  className="text-foreground/80 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium transition-colors hover:border-white/20 hover:bg-white/10"
                  title="+30秒"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
