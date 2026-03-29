"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2 } from "lucide-react";
import { importMatchJsonFile, checkMatchExists } from "@/lib/duckdb/data-loader";
import { initializeDuckDB } from "@/lib/duckdb";
import { toast } from "sonner";
import type { MatchRoot } from "@/types";

export function ImportMatchButton() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      // Read file to check matchId
      const text = await file.text();
      const parsedData = JSON.parse(text) as MatchRoot;
      const matchId = String(parsedData.matchId);

      const exists = await checkMatchExists(matchId);
      if (exists) {
        const ok = window.confirm(`Match ${matchId} is already imported. Do you want to overwrite existing data?`);
        if (!ok) {
           setIsLoading(false);
           if (fileRef.current) fileRef.current.value = "";
           return;
        }
      }

      // Initialize DB just for importing
      const { db, conn } = await initializeDuckDB();
      await importMatchJsonFile(file, db, conn);
      
      toast.success(`Match ${matchId} imported successfully!`);
      
      // Navigate to the newly imported match
      router.push(`/match/${matchId}`);
    } catch (err: any) {
      toast.error(`Failed to import match: ${err.message}`);
      setIsLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={isLoading}
        className="flex items-center px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-lg text-sm font-medium text-slate-200 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-400" />
        ) : (
          <Database className="mr-2 h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
        )}
        {isLoading ? "Importing..." : "Data Import"}
      </button>

      <input
        type="file"
        ref={fileRef}
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
