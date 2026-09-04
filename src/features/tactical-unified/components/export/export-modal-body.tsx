'use client';

import { Crop } from 'lucide-react';
import { ExportImageTab } from './export-image-tab';
import { ExportJsonTab } from './export-json-tab';
import { ExportPreviewPlayer } from './export-preview-player';
import { ExportVideoTab } from './export-video-tab';
import type { ExportModalState } from './use-export-modal-state';

interface ExportModalBodyProps {
  state: ExportModalState;
}

export function ExportModalBody({ state }: ExportModalBodyProps) {
  const {
    activeTab,
    selectedFormat,
    setSelectedFormat,
    isExporting,
    closeExportModal,
    activeSlide,
    slides,
    aspectRatio,
  } = state;

  const box = activeSlide?.boundaryBox;
  const isCropped = Boolean(
    box?.enabled &&
      box.width > 0 &&
      box.height > 0 &&
      (box.width < 100 || box.height < 100 || box.x > 0 || box.y > 0),
  );

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
      <div className="md:col-span-6 space-y-3">
        <ExportPreviewPlayer
          slides={slides}
          aspectRatio={aspectRatio}
          boundaryBox={box}
        />
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/60">
          <Crop
            size={15}
            className={isCropped ? 'text-green-400' : 'text-white/40'}
          />
          <span>
            Export Area:
            <strong
              className={
                isCropped
                  ? 'ml-1.5 text-green-400 font-semibold'
                  : 'ml-1.5 text-white/60 font-normal'
              }
            >
              {isCropped ? 'Cropped to Boundary Box' : 'Full Pitch (100%)'}
            </strong>
          </span>
        </div>
      </div>

      <div className="md:col-span-6 space-y-4">
        {activeTab === 'video' && (
          <ExportVideoTab
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
            morphing={state.morphing}
            maxQueueSize={state.maxQueueSize}
            onMaxQueueSizeChange={state.setMaxQueueSize}
            keyFrameIntervalSec={state.keyFrameIntervalSec}
            onKeyFrameIntervalChange={state.setKeyFrameIntervalSec}
            latencyMode={state.latencyMode}
            onLatencyModeChange={state.setLatencyMode}
            disabled={isExporting}
          />
        )}
        {activeTab === 'image' && (
          <ExportImageTab
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
            scale={state.imageScale}
            onScaleChange={state.setImageScale}
            disabled={isExporting}
          />
        )}
        {activeTab === 'json' && (
          <ExportJsonTab onSuccessClose={closeExportModal} />
        )}
      </div>
    </div>
  );
}
