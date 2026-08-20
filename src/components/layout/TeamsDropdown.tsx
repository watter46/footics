'use client';

import { ChevronDown, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

export const TeamsDropdown: React.FC = () => {
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
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
          isOpen
            ? 'bg-blue-600/20 text-blue-300 border-blue-500/60 ring-2 ring-blue-500/20'
            : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/60 hover:border-slate-600'
        }`}
      >
        <Users className="w-3.5 h-3.5 text-blue-400" />
        <span>Teams</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-800/40">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Club Teams
            </span>
          </div>

          <div className="p-1.5 flex flex-col gap-1">
            <Link
              href="/teams/chelsea"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-blue-600/15 hover:text-blue-300 border border-transparent hover:border-blue-500/30 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-105 group-hover:bg-blue-600/30 transition-all">
                <Shield className="w-4 h-4 fill-blue-500/20" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                  Chelsea FC
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Premier League
                </span>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
