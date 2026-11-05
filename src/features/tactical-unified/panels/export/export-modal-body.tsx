'use client';

import { Copy, Download, Smartphone, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  exportTacticalProjectToJson,
  importTacticalProjectFromJson,
} from '@/lib/db/tactical-projects-db';
import { ExportPreviewPlayer } from './export-preview-player';
import type { ExportModalState } from './use-export-modal-state';

interface ExportModalBodyProps {
  state: ExportModalState;
}

export function ExportModalBody({ state }: ExportModalBodyProps) {
  const {
    activeTab,
    selectedFormat,
    setSelectedFormat,
    imageScale,
    setImageScale,
    isExporting,
    closeExportModal,
    handleExport,
    share,
    activeSlide,
    slides,
    aspectRatio,
    boundaryBox,
    pitchAppearance,
  } = state;

  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const isBusy = isExporting || share.isCreatingShareLink;

  const handleExportJson = () => {
    try {
      exportTacticalProjectToJson(project);
      toast.success('Project JSON exported successfully');
    } catch (_err) {
      toast.error('Failed to export project JSON');
    }
  };

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(project, null, 2));
      toast.success('JSON copied to clipboard');
    } catch (_err) {
      toast.error('Failed to copy JSON');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const imported = await importTacticalProjectFromJson(file, false);
      loadProject(imported);
      toast.success(`Loaded project: "${imported.title}"`);
      closeExportModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import JSON');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderBottomControls = () => {
    if (activeTab === 'image') {
      return (
        <div className="flex items-center gap-3">
          {/* Format Selector (PNG / ZIP) */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setSelectedFormat('png')}
              disabled={isExporting}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedFormat === 'png'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat('zip')}
              disabled={isExporting}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedFormat === 'zip'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              ZIP
            </button>
          </div>

          {/* Scale Selector (1x / 2x / 4x) */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
            {[
              { value: 1, label: '1x' },
              { value: 2, label: '2x' },
              { value: 4, label: '4x' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setImageScale(value)}
                disabled={isExporting}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  imageScale === value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <Button
              variant="secondary"
              size="sm"
              onClick={closeExportModal}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              icon={
                isExporting ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : undefined
              }
            >
              {isExporting
                ? 'Exporting...'
                : `Start ${selectedFormat.toUpperCase()} Export`}
            </Button>
          </div>
        </div>
      );
    }

    if (activeTab === 'video') {
      return (
        <div className="flex items-center gap-3">
          <span className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
            1080p • 60fps FHD
          </span>
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <Button
              variant="secondary"
              size="sm"
              onClick={closeExportModal}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={share.createShareLink}
              disabled={isBusy}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white"
              icon={
                share.isCreatingShareLink ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Smartphone size={14} />
                )
              }
            >
              {share.isCreatingShareLink
                ? '送信リンク生成中...'
                : 'iPhoneに送信'}
            </Button>
          </div>
        </div>
      );
    }

    if (activeTab === 'json') {
      return (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
            icon={<Download size={13} className="text-blue-400" />}
          >
            Download JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyJson}
            icon={<Copy size={13} className="text-blue-400" />}
          >
            Copy JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            icon={<Upload size={13} className="text-emerald-400" />}
          >
            {isImporting ? 'Importing...' : 'Load JSON'}
          </Button>
          <div className="pl-2 border-l border-white/10">
            <Button variant="secondary" size="sm" onClick={closeExportModal}>
              Close
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col p-4 overflow-hidden select-none">
      <ExportPreviewPlayer
        slides={slides}
        aspectRatio={aspectRatio}
        canvasAspectRatio="16:9"
        boundaryBox={boundaryBox ?? activeSlide?.boundaryBox}
        pitchTransform={activeSlide?.pitchTransform}
        pitchAppearance={pitchAppearance}
        screenBackground={project.screenBackground}
        bottomBarSlot={renderBottomControls()}
      />
    </div>
  );
}
