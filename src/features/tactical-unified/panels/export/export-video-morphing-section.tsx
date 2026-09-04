'use client';

import type {
  AnimationEasing,
  PauseSec,
  TransitionSec,
  useVideoMorphingConfig,
} from './use-video-morphing-config';

interface ExportVideoMorphingSectionProps {
  morphing: ReturnType<typeof useVideoMorphingConfig>;
  disabled?: boolean;
}

const TRANSITIONS = [
  { sec: '1.0' as TransitionSec, label: '1.0s', sub: '高速' },
  { sec: '1.5' as TransitionSec, label: '1.5s', sub: '標準' },
  { sec: '2.0' as TransitionSec, label: '2.0s', sub: 'ゆったり' },
  { sec: '3.0' as TransitionSec, label: '3.0s', sub: '長尺' },
];

const PAUSES = [
  { sec: '0' as PauseSec, label: '0s', sub: 'なし' },
  { sec: '0.5' as PauseSec, label: '0.5s', sub: '標準' },
  { sec: '1.0' as PauseSec, label: '1.0s', sub: '1秒' },
  { sec: '2.0' as PauseSec, label: '2.0s', sub: '2秒' },
];

const EASINGS = [
  { val: 'ease-in-out' as AnimationEasing, label: 'EaseInOut' },
  { val: 'ease-out' as AnimationEasing, label: 'EaseOut' },
  { val: 'ease-in' as AnimationEasing, label: 'EaseIn' },
  { val: 'linear' as AnimationEasing, label: 'Linear' },
];

export function ExportVideoMorphingSection({
  morphing,
  disabled = false,
}: ExportVideoMorphingSectionProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/70">Transition Duration</span>
          <span className="text-[9px] text-white/40">スライド間移動秒数</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-black/40 p-0.5 border border-white/10">
          {TRANSITIONS.map(({ sec, label, sub }) => (
            <button
              key={sec}
              type="button"
              onClick={() => morphing.handleTransitionSecChange(sec)}
              disabled={disabled}
              className={[
                'py-1.5 px-2 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                morphing.transitionSec === sec
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/50 hover:text-white',
              ].join(' ')}
            >
              <span className="font-semibold">{label}</span>
              <span className="block text-[8px] opacity-70 mt-0.5">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/70">Hold Duration</span>
          <span className="text-[9px] text-white/40">静止保持</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-black/40 p-0.5 border border-white/10">
          {PAUSES.map(({ sec, label, sub }) => (
            <button
              key={sec}
              type="button"
              onClick={() => morphing.handlePauseSecChange(sec)}
              disabled={disabled}
              className={[
                'py-1.5 px-2 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                morphing.pauseSec === sec
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/50 hover:text-white',
              ].join(' ')}
            >
              <span className="font-semibold">{label}</span>
              <span className="block text-[8px] opacity-70 mt-0.5">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/70">Easing</span>
          <span className="text-[9px] text-white/40">補間イージング</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-black/40 p-0.5 border border-white/10">
          {EASINGS.map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => morphing.handleEasingChange(val)}
              disabled={disabled}
              className={[
                'py-1 px-1.5 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                morphing.selectedEasing === val
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/50 hover:text-white',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
