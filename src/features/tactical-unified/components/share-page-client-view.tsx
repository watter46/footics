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
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';
import { ExportPreviewPlayer } from '@/features/tactical-unified/panels/export/export-preview-player';
import { IOS_ENCODER_PRESETS } from '@/features/tactical-unified/panels/export/ios-export-presets';
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="flex flex-col items-center gap-3 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="font-bold text-sm text-slate-200">
            Loading export data...
          </span>
        </div>
      </div>
    );
  }

  if (exp.loadError || !shareData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/40 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center gap-3">
          <ShieldAlert className="w-10 h-10 text-rose-400" />
          <h2 className="font-bold text-lg text-slate-100">
            Export link not found
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {exp.loadError ||
              'This export URL is invalid or has expired (24h limit).'}
          </p>
          <Link
            href="/export"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Back to Export List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/export" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
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
        <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>24h link</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-xl mx-auto w-full">
        <div className="w-full bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col gap-5 shadow-2xl">
          <ExportPreviewPlayer
            slides={exp.slides}
            aspectRatio={exp.effectiveAspectRatio}
            boundaryBox={shareData.boundaryBox}
            pitchTransform={shareData.pitchTransform}
            photos={shareData.photos}
          />

          {exp.iosInfo.isIOS && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400">
                Encoder Preset
              </p>
              <div className="space-y-2">
                {(
                  Object.entries(IOS_ENCODER_PRESETS) as [
                    'iphone12' | 'iosGeneral',
                    (typeof IOS_ENCODER_PRESETS)[keyof typeof IOS_ENCODER_PRESETS],
                  ][]
                ).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => exp.setSelectedPreset(key)}
                    disabled={exp.isExporting}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer disabled:cursor-not-allowed ${
                      exp.selectedPreset === key
                        ? 'border-emerald-500 bg-emerald-600/15 text-white shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <Sparkles
                      size={16}
                      className={`mt-0.5 shrink-0 ${exp.selectedPreset === key ? 'text-emerald-400' : 'text-white/40'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {preset.label}
                      </p>
                      <p className="text-[11px] text-white/50 mt-0.5 font-mono">
                        {preset.codec} · {preset.fps}fps · {preset.bitrateMbps}{' '}
                        Mbps
                      </p>
                    </div>
                    {exp.selectedPreset === key && (
                      <CheckCircle2
                        size={16}
                        className="text-emerald-400 mt-0.5 shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Scene Information</span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {shareData.scenes.length} Scenes
              </span>
            </div>
            <div className="space-y-1.5 text-slate-400 text-xs">
              {[
                [
                  'Title:',
                  shareData.title || 'Tactical Animation',
                  'text-slate-200 font-medium',
                ],
                [
                  'Aspect Ratio:',
                  exp.effectiveAspectRatio,
                  'text-slate-200 font-mono font-medium',
                ],
                [
                  'Target Resolution:',
                  `${exp.stageWidth} × ${exp.stageHeight}`,
                  'font-mono text-slate-200',
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
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-blue-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering...
                </span>
                <span className="font-mono font-bold text-white text-sm">
                  {exp.exportProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full transition-all duration-150"
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
                <span className="text-xs font-mono text-slate-400 ml-auto">
                  {(exp.exportedBlob.size / 1_000_000).toFixed(1)} MB
                </span>
              </div>

              {exp.canShare && (
                <button
                  type="button"
                  onClick={exp.handleWebShare}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share / Save to Files</span>
                </button>
              )}

              <button
                type="button"
                onClick={exp.handleDownload}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  Save MP4 — Bit-Perfect {activePreset.bitrateMbps} Mbps
                </span>
              </button>

              {exp.iosInfo.isIOS && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                    <Info className="w-3.5 h-3.5" />
                    Bit-Perfect 保存ガイド
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Safariの「ファイルに保存」から iCloud Drive / AirDrop
                    経由でPCへ共有すると写真アプリの強制圧縮を回避できます。
                  </p>
                </div>
              )}
            </div>
          )}

          {!exp.exportCompleted && (
            <button
              type="button"
              onClick={exp.handleExportClick}
              disabled={exp.isExporting}
              className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
