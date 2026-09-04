'use client';

import { FileJson, Film, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import type { ExportTab } from './use-export-modal-state';

interface ExportModalHeaderProps {
  activeTab: ExportTab;
  onTabChange: (tab: ExportTab) => void;
  isCompleted: boolean;
  isExporting: boolean;
  onClose: () => void;
}

const TABS: { id: ExportTab; label: string; icon: React.ElementType }[] = [
  { id: 'video', label: 'Video', icon: Film },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'json', label: 'JSON Data', icon: FileJson },
];

export function ExportModalHeader({
  activeTab,
  onTabChange,
  isCompleted,
  isExporting,
  onClose,
}: ExportModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-400" />
          <h2
            id="export-modal-title"
            className="text-sm font-semibold text-white"
          >
            {isCompleted ? 'Export Completed & Preview' : 'Export Studio'}
          </h2>
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                disabled={isExporting}
                className={[
                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer disabled:opacity-40',
                  activeTab === id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white',
                ].join(' ')}
              >
                <Icon size={13} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={isExporting}
        className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Close modal"
      >
        <X size={16} />
      </button>
    </div>
  );
}
