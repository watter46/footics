'use client';

import { Archive, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import type { ExportFormat } from './use-export-modal-state';

interface ExportImageTabProps {
  selectedFormat: ExportFormat;
  onSelectFormat: (fmt: ExportFormat) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  disabled?: boolean;
}

const IMAGE_FORMATS = [
  {
    format: 'png' as const,
    icon: ImageIcon,
    label: 'PNG (Current Slide)',
    desc: 'Export current slide in high resolution (Boundary-aware)',
    badge: 'Standard',
  },
  {
    format: 'zip' as const,
    icon: Archive,
    label: 'ZIP (All Slides)',
    desc: 'Download all slides as high-res PNG archive',
    badge: 'Bundle',
  },
];

const SCALES = [
  { value: 1, label: '1x', sub: '標準 (720p)' },
  { value: 2, label: '2x', sub: '高画質 (1080p 推奨)' },
  { value: 4, label: '4x', sub: '超解像 (4K 印刷)' },
];

export function ExportImageTab({
  selectedFormat,
  onSelectFormat,
  scale,
  onScaleChange,
  disabled = false,
}: ExportImageTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
          Select Image Format
        </p>
        <div className="space-y-1.5">
          {IMAGE_FORMATS.map(({ format, icon: Icon, label, desc, badge }) => {
            const isSelected = selectedFormat === format;
            return (
              <button
                type="button"
                key={format}
                onClick={() => onSelectFormat(format)}
                disabled={disabled}
                className={[
                  'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed',
                  isSelected
                    ? 'border-blue-500 bg-blue-600/15 text-white shadow-sm ring-1 ring-blue-500/30'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white',
                ].join(' ')}
              >
                <Icon
                  size={16}
                  className={`mt-0.5 shrink-0 ${isSelected ? 'text-blue-400' : 'text-white/60'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-white">{label}</p>
                    {badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-snug">
                    {desc}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2
                    size={15}
                    className="text-blue-400 mt-0.5 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
            Image Resolution / Scale
          </p>
          <span className="text-[10px] text-blue-400 font-medium">
            {scale === 1 ? '720p' : scale === 2 ? '1080p FHD' : '4K UHD'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-black/40 p-0.5 border border-white/10">
          {SCALES.map(({ value, label, sub }) => (
            <button
              key={value}
              type="button"
              onClick={() => onScaleChange(value)}
              disabled={disabled}
              className={[
                'py-1.5 px-2 text-[10px] rounded-md font-medium transition-all cursor-pointer text-center',
                scale === value
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
    </div>
  );
}
