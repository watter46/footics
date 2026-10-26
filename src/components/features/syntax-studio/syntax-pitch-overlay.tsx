'use client';

export interface SyntaxPitchOverlayProps {
  badgeLabel?: string;
  badgeVariant?: 'ai' | 'human';
  title?: string;
  isInteractive: boolean;
  sceneDescription?: string;
  playerCount: number;
}

export function SyntaxPitchOverlay({
  badgeLabel,
  badgeVariant = 'human',
  title,
  isInteractive,
  sceneDescription,
  playerCount,
}: SyntaxPitchOverlayProps) {
  return (
    <>
      {/* ヘッダーオーバーレイ (バッジ・タイトル) */}
      {(badgeLabel || title || isInteractive) && (
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {badgeLabel && (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border shadow-sm ${
                  badgeVariant === 'ai'
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-cyan-950/50'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    badgeVariant === 'ai'
                      ? 'bg-cyan-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`}
                />
                {badgeLabel}
              </span>
            )}
            {title && (
              <span className="text-xs font-medium text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700/50 truncate max-w-[200px] sm:max-w-xs">
                {title}
              </span>
            )}
          </div>

          {isInteractive && (
            <span className="text-[10px] font-medium text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Drag to Adjust
            </span>
          )}
        </div>
      )}

      {/* フッター情報 */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-2 text-[10px] text-slate-400 bg-gradient-to-t from-slate-950/90 to-transparent flex justify-between items-end pointer-events-none">
        <span className="truncate max-w-[80%] font-mono text-[10px] text-slate-400">
          {sceneDescription}
        </span>
        <span className="font-mono text-[10px] text-slate-500 shrink-0">
          {playerCount} Players
        </span>
      </div>
    </>
  );
}
