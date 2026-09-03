'use client';

import { Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { PitchControls } from './components/pitch-controls';
import { PitchHeader } from './components/pitch-header';
import { PitchIndicators } from './components/pitch-indicators';
import { PitchStage } from './components/pitch-stage';
import { usePitchExport } from './hooks/use-pitch-export';
import { usePitchInteraction } from './hooks/use-pitch-interaction';
import { BOUNDARY_CONFIGS, type BoundaryAspectRatio } from './pitch-constants';

export default function PitchAspectTestPage() {
  const [boundaryAspect, setBoundaryAspect] =
    useState<BoundaryAspectRatio>('16:9');
  const [marginPercent, setMarginPercent] = useState<number>(5.0);
  const [showCircleRuler, setShowCircleRuler] = useState<boolean>(true);
  const [showSamplePlayers, setShowSamplePlayers] = useState<boolean>(true);

  const exportRef = useRef<HTMLDivElement | null>(null);
  const interaction = usePitchInteraction();
  const currentConfig = BOUNDARY_CONFIGS[boundaryAspect];

  const { isExporting, copied, handleCopyPng, handleDownloadPng } =
    usePitchExport({
      exportRef,
      boundaryAspect,
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8 space-y-6">
      <PitchHeader
        onCopyPng={handleCopyPng}
        isExporting={isExporting}
        copied={copied}
        tilt={interaction.tilt}
      />

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-3">
          <PitchStage
            exportRef={exportRef}
            config={currentConfig}
            marginPercent={marginPercent}
            showCircleRuler={showCircleRuler}
            showSamplePlayers={showSamplePlayers}
            zoom={interaction.zoom}
            pan={interaction.pan}
            tilt={interaction.tilt}
            isDragging={interaction.isDragging}
            onWheel={interaction.handleWheel}
            onMouseDown={interaction.handleMouseDown}
            onMouseMove={interaction.handleMouseMove}
            onMouseUp={interaction.handleMouseUp}
            onMouseLeave={interaction.handleMouseLeave}
          />
          <PitchIndicators
            currentConfig={currentConfig}
            marginPercent={marginPercent}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <PitchControls
            boundaryAspect={boundaryAspect}
            onSelectBoundaryAspect={setBoundaryAspect}
            marginPercent={marginPercent}
            onUpdateMargin={setMarginPercent}
            onCopyPng={handleCopyPng}
            onDownloadPng={handleDownloadPng}
            isExporting={isExporting}
            copied={copied}
            zoom={interaction.zoom}
            onUpdateZoom={interaction.updateZoom}
            tilt={interaction.tilt}
            onUpdateTilt={interaction.updateTilt}
            onResetView={interaction.resetTransform}
            showCircleRuler={showCircleRuler}
            onToggleCircleRuler={() => setShowCircleRuler((prev) => !prev)}
            showSamplePlayers={showSamplePlayers}
            onToggleSamplePlayers={() => setShowSamplePlayers((prev) => !prev)}
          />

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs space-y-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Info className="size-3.5 text-blue-400" />
              X最適化ピッチ検証要件
            </span>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✔</span>
                <span>境界線基準で比率通り画面いっぱいに表示</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✔</span>
                <span>ピッチと境界線の間に上下左右5%の均等余白</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✔</span>
                <span>ワンクリックでPNG画像をクリップボードにコピー</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✔</span>
                <span>センターサークルが楕円化せず完全な真円を維持</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✔</span>
                <span>ホイールズーム・パン・奥側3Dチルト(2.5D)対応</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
