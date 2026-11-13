'use client';

import { FilePlus2, MoreHorizontal } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import type React from 'react';
import { useRef, useState } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import { buildMatchResetPayload } from '@/features/tactical-unified/stores/reset-tactical-project';
import {
  createDefaultTacticalProject,
  useDocumentStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
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
  const { documentStore, sessionStore } = useTacticalStoresContext();
  const searchParams = useSearchParams();
  const urlMatchId = searchParams?.get('matchId') ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const isImageBackground = useDocumentStore(
    (s) =>
      selectDomainActivePhase(s.project, activePhaseId)?.backgroundType ===
      'image',
  );

  const resetToFreshProject = () => {
    const fresh = createDefaultTacticalProject();
    const p0 = fresh.phases[0];
    documentStore.getState().loadProject(fresh);
    sessionStore.getState().resetSession({
      activePhaseId: p0?.id ?? '',
      activeSlideId: p0?.slides[0]?.id ?? '',
      saveStatus: 'saved',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          dispatch({
            type: 'APPLY_IMAGE_BACKGROUND',
            phaseId: activePhaseId,
            slideId: activeSlideId,
            url: dataUrl,
          });
        }
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

    if (urlMatchId) {
      const payload = await buildMatchResetPayload(urlMatchId);
      if (payload) {
        documentStore.getState().loadProject(payload.project);
        sessionStore.getState().resetSession({
          activePhaseId: payload.activePhaseId,
          activeSlideId: payload.activeSlideId,
          saveStatus: 'saved',
        });
        setIsOpen(false);
        return;
      }
    }

    resetToFreshProject();
    await clearActiveProjectFromDb(null);
    setIsOpen(false);
  };

  const handleLoadPreset = (rawProject: unknown) => {
    const bundle = normalizeTacticalProject(rawProject);
    documentStore.getState().loadProject(bundle.project);
    sessionStore.getState().resetSession({
      activePhaseId: bundle.activePhaseId,
      activeSlideId: bundle.activeSlideId,
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        render={
          <IconButton
            size="sm"
            variant="ghost"
            isActive={isOpen}
            aria-label="More actions"
            title="More actions"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenuContent align="end" sideOffset={6} className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Project</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleNewProject} className="gap-2.5 py-2">
            <FilePlus2 size={14} className="text-[#FF8100] shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium text-white">New Project</span>
              <span className="text-[10px] text-[#A1A1AA]">
                Reset canvas and start a clean project
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <MoreMenuPitchSection
          isImageBackground={isImageBackground}
          onRestoreDefaultPitch={() =>
            dispatch({ type: 'RESTORE_DEFAULT_PITCH', phaseId: activePhaseId })
          }
          onImportClick={() => fileInputRef.current?.click()}
          onClose={() => setIsOpen(false)}
        />

        <DropdownMenuSeparator />

        <MoreMenuPresetsSection
          onLoadProject={handleLoadPreset}
          onClose={() => setIsOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
