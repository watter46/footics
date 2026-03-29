import { scanMatchFiles } from "@/lib/data/scan-matches";
import { ImportMatchButton } from "@/components/features/ImportMatchButton";
import { MatchListClient } from "@/components/features/MatchListClient";

export default async function Home() {
  const matches = scanMatchFiles();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              FootLog
            </span>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
              Match Center
            </span>
          </div>
          <ImportMatchButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Matches
          </h1>
          <p className="text-slate-500 text-sm">
            {matches.length} match{matches.length !== 1 ? "es" : ""} available · Select one to start analysis
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-600">
            <svg width="48" height="48" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-30">
              <path d="M4.5 1.5C4.5 1.22386 4.27614 1 4 1C3.72386 1 3.5 1.22386 3.5 1.5V2.5H2C1.44772 2.5 1 2.94772 1 3.5V13.5C1 14.0523 1.44772 14.5 2 14.5H13C13.5523 14.5 14 14.0523 14 13.5V3.5C14 2.94772 13.5523 2.5 13 2.5H11.5V1.5C11.5 1.22386 11.2761 1 11 1C10.7239 1 10.5 1.22386 10.5 1.5V2.5H4.5V1.5ZM2 4.5H13V13.5H2V4.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
            </svg>
            <p className="text-base font-semibold text-slate-500">No match data found</p>
            <p className="text-sm text-slate-600">Use the &quot;Data Import&quot; button in the header to add match JSON files</p>
          </div>
        ) : (
          <MatchListClient matches={matches} />
        )}
      </main>
    </div>
  );
}
