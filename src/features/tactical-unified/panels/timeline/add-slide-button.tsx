'use client';

/**
 * add-slide-button.tsx
 * Bottom timeline slide addition button with Left/Right click branch & menu
 *
 * Left click: Blank scene
 * Right click: Full Duplicate (copies all drawings, players, zones)
 * Chevron: Base UI Menu rendered in a Portal (not clipped by overflow)
 */

import { ChevronDown, Copy, Plus, Sparkles, SquareDashed } from 'lucide-react';
import type React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

const ITEM_CLASS = 'items-start gap-2 px-2 py-2';

export function AddSlideButton() {
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const addSlide = useTacticalUnifiedStoreContext((s) => s.addSlide);

  const handleLeftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    addSlide(activeSlideId, 'blank');
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addSlide(activeSlideId, 'full');
  };

  return (
    <div className="relative flex items-center shrink-0">
      <div className="flex items-center rounded-lg border border-dashed border-white/[0.08] bg-[#18181B] hover:border-[#FF8100]/50 hover:bg-[#222226] transition-all">
        <button
          type="button"
          onClick={handleLeftClick}
          onContextMenu={handleContextMenu}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer group select-none"
          title="Left Click: Add Blank Scene&#10;Right Click: Duplicate Full Scene"
          aria-label="Add scene (Left-click: Blank Scene, Right-click: Duplicate Full)"
        >
          <Plus
            size={14}
            className="text-[#FF8100] group-hover:scale-110 transition-transform"
          />
          <span className="font-medium text-[11px]">Add Scene</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="group flex items-center justify-center w-6 py-1.5 border-l border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="More scene creation options"
            aria-label="More options"
          >
            <ChevronDown
              size={11}
              className="transition-transform group-data-[popup-open]:rotate-180"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-56"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Add New Scene</DropdownMenuLabel>
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => addSlide(activeSlideId, 'blank')}
              >
                <SquareDashed
                  size={14}
                  className="text-white/80 mt-0.5 shrink-0"
                />
                <div>
                  <div className="text-xs font-semibold">
                    Blank Scene (Left Click)
                  </div>
                  <div className="text-[10px] text-white/40 leading-tight mt-0.5">
                    Fresh default formation setup
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => addSlide(activeSlideId, 'full')}
              >
                <Copy size={14} className="text-[#60A5FA] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">
                    Duplicate Full Scene (Right Click)
                  </div>
                  <div className="text-[10px] text-white/40 leading-tight mt-0.5">
                    Exact clone of background, rings, players &amp; drawings
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => addSlide(activeSlideId, 'object-free')}
              >
                <Sparkles
                  size={14}
                  className="text-[#FF8100] mt-0.5 shrink-0"
                />
                <div>
                  <div className="text-xs font-semibold">
                    Next Step (Keep Pos)
                  </div>
                  <div className="text-[10px] text-white/40 leading-tight mt-0.5">
                    Copies player &amp; ball positions, clears arrows &amp;
                    zones
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
