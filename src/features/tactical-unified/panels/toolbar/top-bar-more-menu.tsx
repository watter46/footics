'use client';

import { FilePlus2, MoreHorizontal } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { getMatchForTacticalProject } from '@/lib/db/tactical-match-helper';
import { injectMatchToTactical } from '@/lib/tactical/match-to-tactical-bridge';
import { clearActiveProjectFromDb } from '@/lib/tactical/tactical-storage';
import {
  MoreMenuPitchSection,
  MoreMenuPresetsSection,
} from './top-bar-more-menu-sections';

export {
  MoreMenuPitchSection,
  MoreMenuPresetsSection,
} from './top-bar-more-menu-sections';

export function TopBarMoreMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setImageBackground = useTacticalUnifiedStore(
    (s) => s.setImageBackground,
  );
  const resetProject = useTacticalUnifiedStore((s) => s.resetProject);
  const isImageBackground = useTacticalUnifiedStore(
    (s) => s.project.backgroundType === 'image',
  );
  const restoreDefaultPitch = useTacticalUnifiedStore(
    (s) => s.restoreDefaultPitch,
  );
  const loadProject = useTacticalUnifiedStore((s) => s.loadProject);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) setImageBackground(dataUrl);
      };
      reader.readAsDataURL(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOpen(false);
  };

  const handleNewProject = async () => {
    const confirmed = window.confirm(
      '現在の戦術プロジェクトをリセットして、まっさらなピッチで新規作成しますか？',
    );
    if (!confirmed) return;

    const currentProject = useTacticalUnifiedStore.getState().project;
    if (currentProject.matchId) {
      const matchId = currentProject.matchId;
      const match = await getMatchForTacticalProject(matchId);

      if (match) {
        resetProject();
        injectMatchToTactical({ match, minute: 0 });
        await clearActiveProjectFromDb(String(matchId));
        useTacticalUnifiedStore.getState().setSaveStatus('saved');
        setIsOpen(false);
        return;
      }
    }

    resetProject();
    await clearActiveProjectFromDb();
    useTacticalUnifiedStore.getState().setSaveStatus('saved');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`p-1.5 rounded transition-colors cursor-pointer ${
          isOpen
            ? 'bg-white/20 text-white'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
        aria-label="More actions"
        aria-expanded={isOpen}
        title="More actions"
      >
        <MoreHorizontal size={15} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl bg-[#18181b] border border-white/15 shadow-2xl py-1.5 z-50 overflow-hidden text-xs">
          <div className="px-3 py-1 text-[10px] uppercase font-semibold tracking-wider text-white/40">
            Project
          </div>
          <button
            type="button"
            onClick={handleNewProject}
            className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-2.5"
          >
            <FilePlus2 size={14} className="text-blue-400 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-white">New Project</span>
              <span className="text-[10px] text-white/50">
                Reset canvas and start a clean project
              </span>
            </div>
          </button>

          <div className="h-px bg-white/10 my-1" />

          <MoreMenuPitchSection
            isImageBackground={isImageBackground}
            onRestoreDefaultPitch={restoreDefaultPitch}
            onImportClick={() => fileInputRef.current?.click()}
            onClose={() => setIsOpen(false)}
          />

          <div className="h-px bg-white/10 my-1" />

          <MoreMenuPresetsSection
            onLoadProject={loadProject}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
