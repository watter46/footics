'use client';

import {
  AlertCircle,
  Check,
  FolderKanban,
  Loader2,
  Pencil,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

export function TopBarTitle() {
  const projectTitle = useTacticalUnifiedStore(
    (s) => s.project.title || 'Untitled Project',
  );
  const setTitle = useTacticalUnifiedStore((s) => s.setTitle);
  const saveStatus = useTacticalUnifiedStore((s) => s.saveStatus);
  const openProjectManagerModal = useTacticalUnifiedStore(
    (s) => s.openProjectManagerModal,
  );

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(projectTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempTitle(projectTitle);
  }, [projectTitle]);

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
    <div className="flex items-center gap-2">
      {/* Brand & Projects Launcher */}
      <button
        type="button"
        onClick={openProjectManagerModal}
        className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
        title="Open Project Manager"
      >
        <FolderKanban size={13} className="text-blue-400" />
        <span className="hidden sm:inline">Projects</span>
      </button>

      {/* Editable Title */}
      {isEditingTitle ? (
        <div className="flex items-center gap-1">
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
            className="px-2 py-0.5 bg-black/60 border border-blue-500 rounded text-xs text-white font-medium focus:outline-none w-36 sm:w-48 truncate"
          />
          <button
            type="button"
            onClick={handleSaveTitle}
            className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
            title="Save Title"
          >
            <Check size={11} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartTitleEdit}
          className="group flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 text-white/90 hover:text-white text-xs font-medium max-w-[140px] sm:max-w-[200px] truncate transition-colors cursor-pointer"
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
      <div className="flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium select-none">
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
