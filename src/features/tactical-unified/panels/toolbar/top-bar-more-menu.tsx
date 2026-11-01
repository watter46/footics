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
import { injectMatchToTactical } from '@/features/tactical-unified/hooks/use-tactical-match-init';
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { getMatchForTacticalProject } from '@/lib/db/tactical-match-helper';
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
  const storeApi = useTacticalUnifiedStoreApi();
  const searchParams = useSearchParams();
  const urlMatchId = searchParams?.get('matchId') ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setImageBackground = useTacticalUnifiedStoreContext(
    (s) => s.setImageBackground,
  );
  const resetProject = useTacticalUnifiedStoreContext((s) => s.resetProject);
  const isImageBackground = useTacticalUnifiedStoreContext(
    (s) => s.project.backgroundType === 'image',
  );
  const restoreDefaultPitch = useTacticalUnifiedStoreContext(
    (s) => s.restoreDefaultPitch,
  );
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);

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

    if (urlMatchId) {
      const match = await getMatchForTacticalProject(urlMatchId);
      if (match) {
        resetProject();
        injectMatchToTactical({ match, minute: 0, storeApi });
        await clearActiveProjectFromDb(urlMatchId);
        storeApi.getState().setSaveStatus('saved');
        setIsOpen(false);
        return;
      }
    }

    resetProject();
    await clearActiveProjectFromDb(null);
    storeApi.getState().setSaveStatus('saved');
    setIsOpen(false);
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
          onRestoreDefaultPitch={restoreDefaultPitch}
          onImportClick={() => fileInputRef.current?.click()}
          onClose={() => setIsOpen(false)}
        />

        <DropdownMenuSeparator />

        <MoreMenuPresetsSection
          onLoadProject={loadProject}
          onClose={() => setIsOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
