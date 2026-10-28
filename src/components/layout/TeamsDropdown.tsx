'use client';

import { ChevronDown, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SUPPORTED_TEAMS } from '@/lib/tactical/teams-config';

export function TeamsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="secondary"
        size="sm"
        isActive={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        icon={<Users className="w-3.5 h-3.5 text-[#FF8A00]" />}
        iconPosition="left"
        className="font-bold gap-1.5"
      >
        <span>Teams</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#A1A1AA] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#FF8A00]' : ''
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl shadow-2xl bg-[#222226] border border-white/[0.08] backdrop-blur-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 border-b border-white/[0.08] bg-white/[0.02]">
            <span className="text-[10px] font-black text-[#A1A1AA] uppercase tracking-widest">
              Club Teams
            </span>
          </div>

          <div className="p-1.5 flex flex-col gap-1 max-h-72 overflow-y-auto">
            {SUPPORTED_TEAMS.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#F4F4F5] hover:bg-[#18181B] border border-transparent hover:border-white/[0.07] transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#FF8A00] group-hover:scale-105 group-hover:bg-[#FF8100]/15 transition-all shrink-0">
                  <Shield className="w-4 h-4 fill-[#FF8100]/20" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-[#F4F4F5] group-hover:text-[#FF8A00] transition-colors truncate">
                    {team.name}
                  </span>
                  <span className="text-[10px] text-[#A1A1AA] font-medium truncate">
                    {team.league}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
