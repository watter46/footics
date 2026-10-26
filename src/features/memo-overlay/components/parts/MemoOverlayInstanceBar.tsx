interface MemoOverlayInstanceBarProps {
  matchId: string | undefined;
  uiVersion: string;
}

export function MemoOverlayInstanceBar({
  matchId,
  uiVersion,
}: MemoOverlayInstanceBarProps) {
  return (
    <div className="flex-shrink-0 px-5 py-2 bg-slate-950 flex items-center justify-between font-mono">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-[9px] text-slate-300 font-bold uppercase truncate">
          Target: {matchId || 'No Instance Connected'}
        </span>
      </div>
      <div className="text-[9px] font-black text-slate-200 tracking-tighter">
        CENTRAL FOCUS CORE v{uiVersion}
      </div>
    </div>
  );
}
