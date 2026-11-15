'use client';

import { ImagePlus, RotateCcw } from 'lucide-react';
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/menu';

export interface PitchSectionProps {
  isImageBackground: boolean;
  onRestoreDefaultPitch: () => void;
  onImportClick: () => void;
  onClose: () => void;
}

export function MoreMenuPitchSection({
  isImageBackground,
  onRestoreDefaultPitch,
  onImportClick,
  onClose,
}: PitchSectionProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Pitch &amp; Background</DropdownMenuLabel>

      <DropdownMenuItem onClick={onImportClick} className="gap-2.5 py-2">
        <ImagePlus size={14} className="text-[#FF8100] shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium text-white">
            Import Background Image
          </span>
          <span className="text-[10px] text-[#A1A1AA]">
            Set screenshot or custom tactic pitch image
          </span>
        </div>
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={() => {
          onRestoreDefaultPitch();
          onClose();
        }}
        disabled={!isImageBackground}
        className="gap-2.5 py-2"
      >
        <RotateCcw size={14} className="text-[#FF8100] shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium">Clear Background Image</span>
          <span className="text-[10px] text-[#A1A1AA]">
            Restore standard tactical pitch
          </span>
        </div>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  );
}
