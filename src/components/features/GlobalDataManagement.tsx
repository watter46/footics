'use client';

import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Database,
  Download,
  RefreshCw,
  Settings,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { exportAllDataZip, importAllDataZip } from '@/lib/data-management';

export function GlobalDataManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside (standard behavior)
  const toggleMenu = () => setIsOpen(!isOpen);

  const handleExport = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Preparing backup file...', {
      description: 'Compressing all matches and memos into a ZIP archive.',
    });

    try {
      await exportAllDataZip();
      toast.success('Backup downloaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
      setIsOpen(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const toastId = toast.loading('Restoring data...', {
      description: 'Decoding archive and merging into IndexedDB.',
    });

    try {
      const result = await importAllDataZip(file);
      toast.success('Restore complete!', {
        id: toastId,
        description: `Successfully merged ${result.matchCount} matches and ${result.memoCount} items. Finalizing...`,
        duration: 3500,
      });

      // Give the browser a bit more time to flush to disk and the user to read the message
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
      setIsOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMenu}
        className={`flex items-center gap-2 text-slate-400 hover:text-slate-100 bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/60 transition-all ${isOpen ? 'ring-2 ring-blue-500/50 text-slate-100' : ''}`}
      >
        <Database className="w-4 h-4" />
        <span className="hidden sm:inline font-semibold">Global Data</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop for mobile or just to capture clicks */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl bg-slate-900 border border-slate-700/60 z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" />
                Data Management
              </h3>
            </div>

            <div className="p-1.5 flex flex-col gap-1">
              <button
                disabled={isProcessing}
                onClick={handleExport}
                className="flex items-center w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group disabled:opacity-50"
              >
                <Archive className="mr-3 h-4 w-4 text-orange-400 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-medium text-slate-200">
                    Full Backup (.zip)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Export matches, memos, and events
                  </span>
                </div>
                {isProcessing && (
                  <RefreshCw className="ml-auto w-3.5 h-3.5 animate-spin opacity-50" />
                )}
              </button>

              <button
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-4 h-4 mr-3">
                  <Upload className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-medium text-slate-200">
                    Restore Data
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Merge from existing backup ZIP
                  </span>
                </div>
              </button>
            </div>

            <div className="px-3 py-2 bg-slate-950/40 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 italic">
                Matches are merged by ID. Existing memos will be updated.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Hidden input for ZIP file */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".zip"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  );
}
