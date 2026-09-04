'use client';

interface ExportVideoPipelineSectionProps {
  maxQueueSize: '60' | '240';
  onMaxQueueSizeChange: (val: '60' | '240') => void;
  keyFrameIntervalSec: '1' | '2' | '5' | '10';
  onKeyFrameIntervalChange: (val: '1' | '2' | '5' | '10') => void;
  latencyMode: 'realtime' | 'quality';
  onLatencyModeChange: (val: 'realtime' | 'quality') => void;
  disabled?: boolean;
}

const GOPS = [
  { sec: '1' as const, label: '1s' },
  { sec: '2' as const, label: '2s' },
  { sec: '5' as const, label: '5s' },
  { sec: '10' as const, label: '10s' },
];

export function ExportVideoPipelineSection({
  maxQueueSize,
  onMaxQueueSizeChange,
  keyFrameIntervalSec,
  onKeyFrameIntervalChange,
  latencyMode,
  onLatencyModeChange,
  disabled = false,
}: ExportVideoPipelineSectionProps) {
  return (
    <div className="space-y-2 pt-1 border-t border-white/10">
      <div>
        <span className="text-[9px] text-white/50 block mb-1">
          Keyframe GOP
        </span>
        <div className="grid grid-cols-4 gap-1 rounded-md bg-black/40 p-0.5 border border-white/10">
          {GOPS.map(({ sec, label }) => (
            <button
              key={sec}
              type="button"
              onClick={() => onKeyFrameIntervalChange(sec)}
              disabled={disabled}
              className={[
                'py-1 text-[10px] rounded font-medium transition-all cursor-pointer text-center',
                keyFrameIntervalSec === sec
                  ? 'bg-blue-600 text-white'
                  : 'text-white/50 hover:text-white',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[9px] text-white/50 block mb-1">
            Queue Size
          </span>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-black/40 p-0.5 border border-white/10">
            {(['60', '240'] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onMaxQueueSizeChange(q)}
                disabled={disabled}
                className={[
                  'py-1 text-[10px] rounded font-medium transition-all cursor-pointer text-center',
                  maxQueueSize === q
                    ? 'bg-blue-600 text-white'
                    : 'text-white/50 hover:text-white',
                ].join(' ')}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[9px] text-white/50 block mb-1">
            Latency Mode
          </span>
          <div className="grid grid-cols-2 gap-1 rounded-md bg-black/40 p-0.5 border border-white/10">
            {(['realtime', 'quality'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onLatencyModeChange(m)}
                disabled={disabled}
                className={[
                  'py-1 text-[9px] capitalize rounded font-medium transition-all cursor-pointer text-center',
                  latencyMode === m
                    ? 'bg-blue-600 text-white'
                    : 'text-white/50 hover:text-white',
                ].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
