'use client';

import {
  AlertCircle,
  Check,
  FolderKanban,
  Loader2,
  Pencil,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export function TopBarTitle() {
  const projectTitle = useTacticalUnifiedStoreContext(
    (s) => s.project.title || 'Untitled Project',
  );
  const setTitle = useTacticalUnifiedStoreContext((s) => s.setTitle);
  const saveStatus = useTacticalUnifiedStoreContext((s) => s.saveStatus);
  const openProjectManagerModal = useTacticalUnifiedStoreContext(
    (s) => s.openProjectManagerModal,
  );

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(projectTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleStartTitleEdit = () => {
    setTempTitle(projectTitle);
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.select();
    }, 50);
  };

  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim() || 'Untitled Project';
    setTitle(trimmed);
    setIsEditingTitle(false);
  };

  return (
    <div className="flex items-center gap-2 shrink-0 min-w-0">
      {/* Brand & Projects Launcher */}
      <Button
        variant="secondary"
        size="sm"
        onClick={openProjectManagerModal}
        icon={<FolderKanban size={13} className="text-[#FF8100]" />}
        title="Open Project Manager"
        className="font-semibold tracking-wide shrink-0"
      >
        <span className="hidden sm:inline">Projects</span>
      </Button>

      {/* Editable Title */}
      {isEditingTitle ? (
        <div className="flex items-center gap-1 min-w-0">
          <input
            ref={titleInputRef}
            type="text"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setTempTitle(projectTitle);
                setIsEditingTitle(false);
              }
            }}
            className="px-2 py-0.5 bg-[#121214] border border-[#FF8100]/50 focus:border-[#FF8100] rounded text-xs text-white font-medium focus:outline-none w-28 sm:w-36 md:w-48 truncate transition-colors"
          />
          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleSaveTitle}
            title="Save Title"
            aria-label="Save Title"
            className="text-[#FF8100] hover:text-[#FF8100] hover:bg-[#FF8100]/10"
          >
            <Check size={11} />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartTitleEdit}
          className="group flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 text-white/90 hover:text-white text-xs font-medium max-w-[100px] sm:max-w-[140px] md:max-w-[180px] lg:max-w-[220px] truncate transition-colors cursor-pointer shrink min-w-0"
          title="Click to rename project"
        >
          <span className="truncate">{projectTitle}</span>
          <Pencil
            size={10}
            className="opacity-0 group-hover:opacity-70 transition-opacity text-white/60 shrink-0"
          />
        </button>
      )}

      {/* Save Status Indicator */}
      <div className="flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium select-none shrink-0">
        {saveStatus === 'saving' && (
          <div
            className="flex items-center gap-1 text-amber-400/90"
            title="Auto-saving to IndexedDB..."
          >
            <Loader2 size={11} className="animate-spin" />
            <span className="hidden md:inline">Saving</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div
            className="flex items-center gap-1 text-emerald-400/80"
            title="All changes saved to IndexedDB"
          >
            <Check size={11} />
            <span className="hidden md:inline">Saved</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div
            className="flex items-center gap-1 text-rose-400"
            title="Failed to save changes"
          >
            <AlertCircle size={11} />
            <span className="hidden md:inline">Save Error</span>
          </div>
        )}
        {saveStatus === 'idle' && (
          <div className="flex items-center gap-1 text-white/40" title="Ready">
            <Check size={11} className="opacity-40" />
            <span className="hidden md:inline">Saved</span>
          </div>
        )}
      </div>
    </div>
  );
}
