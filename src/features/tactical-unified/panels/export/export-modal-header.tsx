'use client';

import { FileJson, Film, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import type * as React from 'react';
import { IconButton } from '@/components/ui/icon-button';
import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui/segmented-control';
import type { ExportTab } from './use-export-modal-state';

interface ExportModalHeaderProps {
  activeTab: ExportTab;
  onTabChange: (tab: ExportTab) => void;
  isCompleted: boolean;
  isExporting: boolean;
  onClose: () => void;
}

const TABS: SegmentOption<ExportTab>[] = [
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
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 select-none">
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
          <SegmentedControl<ExportTab>
            value={activeTab}
            options={TABS}
            onChange={onTabChange}
            disabled={isExporting}
          />
        )}
      </div>

      <IconButton
        variant="ghost"
        size="sm"
        onClick={onClose}
        disabled={isExporting}
        aria-label="Close modal"
        className="text-white/50 hover:text-white"
      >
        <X size={16} />
      </IconButton>
    </div>
  );
}
