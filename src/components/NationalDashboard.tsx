"use client";

import { useNationalDashboard } from "@/hooks/use-national-dashboard";
import { EventTimeline } from "@/components/features/EventTimeline";
import { CentralFocusModal } from "@/components/features/CentralFocusModal";
import { MatchMemoModal } from "@/components/features/MatchMemoModal";
import { TacticalBoardModal } from "@/components/features/TacticalBoard/TacticalBoardModal";
import { ChevronLeft, Edit3 } from "lucide-react";
import Link from "next/link";

import { useUIStore } from "@/hooks/use-ui-store";
import { useModalToggleShortcut } from "@/hooks/use-shortcut";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts";
import { useState } from "react";

interface Props {
  matchId: string;
  defaultHome: string;
  defaultAway: string;
  defaultScore: string;
}

export default function NationalDashboard({ matchId, defaultHome, defaultAway, defaultScore }: Props) {
  const d = useNationalDashboard({ matchId, defaultHome, defaultAway, defaultScore });
  const { 
    isMatchMemoOpen, setMatchMemoOpen,
    isTacticalBoardOpen, setTacticalBoardOpen,
    setHighlightEventId 
  } = useUIStore();
  
  const [highlightIdLocal, setHighlightIdLocal] = useState<string | null>(null);

  // Modal Shortcuts
  useModalToggleShortcut(SHORTCUT_ACTIONS.TOGGLE_MATCH_MEMO, setMatchMemoOpen, { isOpen: isMatchMemoOpen });
  useModalToggleShortcut(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, setTacticalBoardOpen, { isOpen: isTacticalBoardOpen });

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
        <div className="flex justify-between items-center mb-6 pl-2 pb-4 border-b border-slate-800/60 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-4 text-slate-200">
              <span className="font-bold text-lg">{d.metadata.teams.home.name}</span>
              <div className="px-3 py-1 bg-slate-800/80 rounded-md font-mono text-sm font-bold shadow-inner">
                 {d.metadata.score}
              </div>
              <span className="font-bold text-lg text-slate-300">{d.metadata.teams.away.name}</span>
            </div>
            <span className="ml-4 px-2 py-1 bg-emerald-900/50 text-emerald-400 text-xs font-bold rounded">National</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setMatchMemoOpen(true)} className="flex items-center px-4 py-2 bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-slate-200 shadow-sm transition-all group">
              <Edit3 className="h-4 w-4 mr-2 text-amber-400 group-hover:text-amber-300" />Memo
            </button>
            <div className="text-slate-500 text-sm">
              Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Ctrl+M</kbd>
            </div>
          </div>
        </div>
        
        <EventTimeline
          events={d.events}
          totalCount={d.events.length}
          isQuerying={false}
          metadata={d.metadata}
          activeStrategies={new Set()}
          highlightEventId={highlightIdLocal}
          onEditCustomEvent={d.handleEditCustomEvent}
          onDeleteCustomEvent={d.handleDeleteCustomEvent}
        />
        
        <CentralFocusModal 
          matchId={matchId} db={null} connection={null}
          editingEvent={d.editingEvent}
          onClose={() => d.setEditingEvent(null)}
          onRefresh={(id) => {
            d.setRefreshTrigger(p => p + 1);
            setHighlightIdLocal(id);
            setHighlightEventId(id);
          }} 
        />

        <MatchMemoModal matchId={matchId} isOpen={isMatchMemoOpen} onClose={() => setMatchMemoOpen(false)} />
        <TacticalBoardModal matchId={matchId} isOpen={isTacticalBoardOpen} onClose={() => setTacticalBoardOpen(false)} metadata={d.metadata} />
      </main>
    </div>
  );
}
