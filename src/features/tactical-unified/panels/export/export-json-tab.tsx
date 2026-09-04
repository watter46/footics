'use client';

import { Copy, Download, FileJson, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  exportTacticalProjectToJson,
  importTacticalProjectFromJson,
} from '@/lib/db/tactical-projects-db';

interface ExportJsonTabProps {
  onSuccessClose?: () => void;
}

export function ExportJsonTab({ onSuccessClose }: ExportJsonTabProps) {
  const project = useTacticalUnifiedStore((s) => s.project);
  const loadProject = useTacticalUnifiedStore((s) => s.loadProject);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

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
      onSuccessClose?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import JSON');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
        <div className="flex items-center gap-2.5">
          <FileJson size={18} className="text-blue-400" />
          <div>
            <h4 className="text-xs font-semibold text-white">
              {project.title || 'Untitled Project'}
            </h4>
            <p className="text-[10px] text-white/50 mt-0.5">
              {project.slides.length} slides • Aspect Ratio:{' '}
              {project.aspectRatio}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
          Export / Backup
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/25 hover:text-white text-white/70 text-xs font-medium transition-all cursor-pointer"
          >
            <Download size={15} className="text-blue-400" />
            <span>Download JSON</span>
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-white/25 hover:text-white text-white/70 text-xs font-medium transition-all cursor-pointer"
          >
            <Copy size={15} className="text-blue-400" />
            <span>Copy to Clipboard</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">
          Import / Restore
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5 text-white/70 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
        >
          <Upload size={15} className="text-emerald-400" />
          <span>
            {isImporting
              ? 'Importing Project...'
              : 'Select Footics JSON File to Load'}
          </span>
        </button>
      </div>
    </div>
  );
}
