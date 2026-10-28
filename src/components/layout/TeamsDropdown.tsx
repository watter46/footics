'use client';

import { ChevronDown, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import { SUPPORTED_TEAMS } from '@/lib/tactical/teams-config';

export function TeamsDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            size="sm"
            icon={<Users className="w-3.5 h-3.5 text-[#FF8A00]" />}
            iconPosition="left"
            className="font-bold gap-1.5"
          >
            <span>Teams</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA]" />
          </Button>
        }
      />

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Club Teams</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {SUPPORTED_TEAMS.map((team) => (
              <DropdownMenuItem
                key={team.id}
                render={<Link href={`/teams/${team.id}`} />}
                className="gap-3 py-2"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#FF8A00] shrink-0">
                  <Shield className="w-4 h-4 fill-[#FF8100]/20" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[#F4F4F5] truncate">
                    {team.name}
                  </span>
                  <span className="text-[10px] text-[#A1A1AA] font-medium truncate">
                    {team.league}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
