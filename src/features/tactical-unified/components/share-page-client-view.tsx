'use client';

import {
  CheckCircle2,
  Clock,
  Download,
  Film,
  Info,
  Loader2,
  Share2,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoading } from '@/components/ui/patterns/loading-state';
import { ExportPreviewPlayer } from '@/features/tactical-unified/panels/export/export-preview-player';
import { useSharePageExport } from './use-share-page-export';

export interface SharePageClientViewProps {
  shareId?: string;
}

export function SharePageClientView({
  shareId: propShareId,
}: SharePageClientViewProps): JSX.Element {
  const exp = useSharePageExport({ shareId: propShareId });
  const { shareData, activePreset } = exp;

  if (exp.isLoading) {
    return (
      <div className="min-h-screen bg-surface-l0 flex items-center justify-center text-white p-4">
        <Card className="flex flex-col items-center gap-3 bg-surface-l2 border-white/[0.08] p-8 rounded-2xl shadow-2xl">
          <PageLoading message="Loading export data..." />
        </Card>
      </div>
    );
  }

  if (exp.loadError || !shareData) {
    return (
      <div className="min-h-screen bg-surface-l0 flex items-center justify-center text-white p-4">
        <Card className="max-w-md w-full bg-surface-l2 border-rose-900/40 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-3">
          <ShieldAlert className="w-10 h-10 text-rose-400" />
          <h2 className="font-bold text-lg text-white">
            Export link not found
          </h2>
          <p className="text-xs text-white/60 leading-relaxed">
            {exp.loadError ||
              'This export URL is invalid or has expired (24h limit).'}
          </p>
          <Link
            href="/export"
            className="px-4 py-2 bg-surface-l3 hover:bg-white/10 text-white rounded-lg text-xs font-semibold transition-colors border border-white/[0.08]"
          >
            Back to Export List
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-l0 text-white flex flex-col select-none">
      <header className="h-14 border-b border-white/[0.08] bg-surface-l1/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/export" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
              Footics Export Studio
            </span>
          </Link>
          {exp.iosInfo.isIOS && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Smartphone className="w-2.5 h-2.5" />
              {exp.iosInfo.isIPhone12 ? 'iPhone 12 A14 Mode' : 'iOS Mode'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-white/60 bg-surface-l0 px-2.5 py-1 rounded-lg border border-white/[0.08]">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>24h link</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-xl mx-auto w-full">
        <Card className="w-full bg-surface-l2 border-white/[0.08] p-6 rounded-2xl flex flex-col gap-5 shadow-2xl">
          <ExportPreviewPlayer
            slides={exp.slides}
            aspectRatio={exp.effectiveAspectRatio}
            boundaryBox={shareData.boundaryBox}
            pitchTransform={shareData.pitchTransform}
            photos={shareData.photos}
            pitchAppearance={shareData.pitchAppearance}
          />

          <div className="p-4 rounded-xl bg-surface-l0 border border-white/[0.08] space-y-2 text-xs">
            <div className="font-semibold text-white/80 flex items-center justify-between">
              <span>Scene Information</span>
              <span className="text-[10px] font-mono text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded border border-accent-orange/20">
                {shareData.scenes.length} Scenes
              </span>
            </div>
            <div className="space-y-1.5 text-white/60 text-xs">
              {[
                [
                  'Title:',
                  shareData.title || 'Tactical Animation',
                  'text-white font-medium',
                ],
                [
                  'Aspect Ratio:',
                  exp.effectiveAspectRatio,
                  'text-white font-mono font-medium',
                ],
                [
                  'Target Resolution:',
                  `${exp.stageWidth} × ${exp.stageHeight}`,
                  'font-mono text-white',
                ],
                [
                  'Target Bitrate:',
                  `${activePreset.bitrateMbps} Mbps (Bit-Perfect)`,
                  'font-mono text-emerald-400',
                ],
              ].map(([lbl, val, cls]) => (
                <div key={lbl} className="flex justify-between">
                  <span>{lbl}</span>
                  <span className={cls}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {exp.isExporting && (
            <div className="p-4 rounded-xl bg-accent-orange/10 border border-accent-orange/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-accent-orange flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering...
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  {exp.exportProgress}%
                </span>
              </div>
              <div className="w-full bg-surface-l0 rounded-full h-2.5 overflow-hidden border border-white/[0.08]">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-accent-orange h-full rounded-full transition-all duration-150"
                  style={{ width: `${exp.exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {exp.exportError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              Error: {exp.exportError}
            </div>
          )}

          {exp.exportCompleted && exp.exportedBlob && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">
                  Export Completed!
                </span>
                <span className="text-xs font-mono text-white/60 ml-auto">
                  {(exp.exportedBlob.size / 1_000_000).toFixed(1)} MB
                </span>
              </div>

              {exp.canShare ? (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={exp.handleWebShare}
                    className="w-full py-3.5 px-4 h-auto text-sm font-bold shadow-xl transition-all gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share / Save to Files</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={exp.handleDownload}
                    className="w-full py-3.5 px-4 h-auto text-sm font-semibold transition-all gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save MP4 (Direct Download)</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={exp.handleDownload}
                  className="w-full py-3.5 px-4 h-auto text-sm font-bold shadow-xl transition-all gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Save MP4 (Direct Download)</span>
                </Button>
              )}

              <div className="p-3 rounded-xl bg-surface-l0 border border-white/[0.08] text-xs text-white/80 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <Info className="w-3.5 h-3.5" />
                  保存ガイド
                </div>
                <p className="text-[11px] leading-relaxed text-white/60">
                  ファイルアプリまたはダウンロードで劣化のない60fps高画質MP4を保存できます。
                </p>
              </div>
            </div>
          )}

          {!exp.exportCompleted && (
            <Button
              variant="primary"
              size="lg"
              onClick={exp.handleExportClick}
              disabled={exp.isExporting}
              className="w-full py-4 px-4 h-auto font-bold text-sm shadow-xl transition-all gap-2"
            >
              {exp.isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encoding... ({exp.exportProgress}%)</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {exp.iosInfo.isIOS
                      ? `Export with A14 Bionic (${activePreset.bitrateMbps}Mbps)`
                      : 'Start Export'}
                  </span>
                </>
              )}
            </Button>
          )}
        </Card>
      </main>
    </div>
  );
}
