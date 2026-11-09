'use client';

import { Download, Film, Loader2, Share2, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoading } from '@/components/ui/patterns/loading-state';
import { ExportPreviewPlayer } from '@/features/tactical-unified/panels/export/export-preview-player';
import {
  IOS_COMPARISON_PRESET_KEYS,
  IOS_ENCODER_PRESETS,
} from '@/features/tactical-unified/panels/export/ios-export-presets';
import { useSharePageExport } from './use-share-page-export';

const BTN_ACTIVE = 'border-emerald-500 bg-emerald-600/15 text-white';
const BTN_INACTIVE =
  'border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.05]';

export function SharedExportView({ shareId }: { shareId: string }) {
  const exp = useSharePageExport({ shareId });
  const { shareData, activePreset } = exp;

  if (exp.isLoading || exp.loadError || !shareData) {
    return (
      <div className="min-h-screen bg-surface-l0 flex flex-col items-center justify-center p-4 text-center gap-3 text-white">
        {exp.isLoading ? (
          <PageLoading message="Loading export data..." />
        ) : (
          <p className="text-sm text-white/60">
            {exp.loadError || 'Export URL is invalid or expired.'}
          </p>
        )}
        {!exp.isLoading && (
          <Link
            href="/export"
            className="px-4 py-2 bg-surface-l3 hover:bg-white/10 text-white rounded-lg text-xs font-semibold transition-colors border border-white/[0.08]"
          >
            Back to List
          </Link>
        )}
      </div>
    );
  }

  const infoList = [
    ['Title:', shareData.title || 'Untitled', 'text-white truncate'],
    ['Scenes:', `${shareData.scenes.length}`, 'text-accent-orange font-mono'],
    ['Res:', `${exp.stageWidth}×${exp.stageHeight}`, 'font-mono text-white'],
    [
      'Bitrate:',
      `${activePreset.bitrateMbps} Mbps`,
      'font-mono text-emerald-400',
    ],
  ] as const;

  return (
    <div className="min-h-screen bg-surface-l0 text-white flex flex-col select-none">
      <header className="h-14 border-b border-white/[0.08] bg-surface-l1/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
        <Link
          href="/export"
          className="flex items-center gap-2 font-bold text-sm text-white"
        >
          <Film className="w-4 h-4 text-accent-orange" />
          Footics Export Studio
          {exp.iosInfo.isIOS && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {exp.iosInfo.isIPhone12 ? 'A14' : 'iOS'}
            </span>
          )}
        </Link>
        <span className="text-xs text-white/60 bg-surface-l0 px-2 py-0.5 rounded border border-white/[0.08]">
          24h
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-xl mx-auto w-full">
        <Card className="w-full bg-surface-l2 border-white/[0.08] p-5 rounded-2xl flex flex-col gap-4 shadow-2xl">
          <div className="w-full h-[45vh] min-h-[300px] max-h-[520px] flex items-center justify-center">
            <ExportPreviewPlayer
              slides={exp.slides}
              aspectRatio={exp.effectiveAspectRatio}
              boundaryBox={shareData.boundaryBox}
              pitchTransform={shareData.pitchTransform}
              directorCamera={shareData.directorCamera}
              screenBackground={shareData.screenBackground ?? undefined}
              photos={shareData.photos}
              pitchAppearance={shareData.pitchAppearance}
            />
          </div>

          <div className="flex gap-2">
            {IOS_COMPARISON_PRESET_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={exp.presetKey === k}
                onClick={() => exp.setPresetKey(k)}
                disabled={exp.isExporting}
                className={`flex-1 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${exp.presetKey === k ? BTN_ACTIVE : BTN_INACTIVE}`}
              >
                <div className="font-bold">
                  {IOS_ENCODER_PRESETS[k].shortLabel}
                </div>
                <div className="text-[10px] text-white/50">
                  {IOS_ENCODER_PRESETS[k].description}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-l0 border border-white/[0.08] text-xs text-white/60">
            {infoList.map(([l, v, c]) => (
              <div key={l}>
                {l} <span className={c}>{v}</span>
              </div>
            ))}
          </div>

          {exp.isExporting && (
            <div className="p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/30 space-y-1.5 text-xs">
              <div className="flex justify-between text-accent-orange font-bold">
                <span>Rendering...</span>
                <span>{exp.exportProgress}%</span>
              </div>
              <div className="w-full bg-surface-l0 rounded-full h-2 overflow-hidden border border-white/[0.08]">
                <div
                  className="bg-accent-orange h-full transition-all"
                  style={{ width: `${exp.exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {exp.exportedBlob ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-emerald-300 font-bold px-1">
                <span>Completed</span>
                <span className="font-mono text-white/60">
                  {(exp.exportedBlob.size / 1e6).toFixed(1)} MB
                </span>
              </div>
              <div className="flex gap-2">
                {exp.canShare && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={exp.handleWebShare}
                    className="flex-1 font-bold text-xs gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={exp.handleDownload}
                  className="flex-1 font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save MP4
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={exp.handleExportClick}
              disabled={exp.isExporting}
              className="w-full py-3 h-auto font-bold text-sm gap-2"
            >
              {exp.isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
              <span>
                {exp.isExporting
                  ? `Encoding... (${exp.exportProgress}%)`
                  : `Export (${activePreset.bitrateMbps}Mbps)`}
              </span>
            </Button>
          )}
        </Card>
      </main>
    </div>
  );
}
