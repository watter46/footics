"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Database, Upload, Download, FileUp } from "lucide-react";
import { importMatchJsonFile, checkMatchExists } from "@/lib/duckdb/data-loader";
import { exportMemosAsJson, importMemosFromJson } from "@/lib/db";
import { toast } from "sonner";
import type * as duckdb from "@duckdb/duckdb-wasm";
import { MatchRoot } from "@/types";

interface DataManagementMenuProps {
  matchId: string;
  db: duckdb.AsyncDuckDB | null;
  connection: duckdb.AsyncDuckDBConnection | null;
  onRefresh: () => void;
}

export function DataManagementMenu({ matchId, db, connection, onRefresh }: DataManagementMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const matchFileRef = useRef<HTMLInputElement>(null);
  const memoFileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImportMatch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !connection) return;
    
    try {
      // Check if it already exists before importing
      const text = await file.text();
      const parsedData = JSON.parse(text) as MatchRoot;
      const parsedMatchId = String(parsedData.matchId);
      
      const exists = await checkMatchExists(parsedMatchId);
      if (exists) {
        if (!confirm(`Match ${parsedMatchId} is already imported. Overwrite existing data?`)) {
          if (matchFileRef.current) matchFileRef.current.value = "";
          return;
        }
      }

      // Re-create the file object because file.text() read destroys the stream in some browsers if consumed, 
      // but actually a File object text() method reads from the underlying Blob so we can read it again, 
      // however better to build a new one or just rely on importMatchJsonFile parsing it again. 
      // Fortunately File.text() can be read multiple times.
      const newMatchId = await importMatchJsonFile(file, db, connection);
      toast.success(`Match ${newMatchId} imported successfully`);
      setIsOpen(false);
      // If we imported a new match, maybe navigate to it?
      if (newMatchId !== matchId) {
        router.push(`/match/${newMatchId}`);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(`Failed to import match: ${err.message}`);
    } finally {
      if (matchFileRef.current) matchFileRef.current.value = "";
    }
  };

  const handleExportMemos = async () => {
    try {
      await exportMemosAsJson(matchId);
      toast.success("Memos exported successfully");
      setIsOpen(false);
    } catch (err: any) {
      toast.error(`Failed to export memos: ${err.message}`);
    }
  };

  const handleImportMemos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const count = await importMemosFromJson(file, matchId);
      toast.success(`${count} memos imported successfully`);
      onRefresh();
      setIsOpen(false);
    } catch (err: any) {
      toast.error(`Failed to import memos: ${err.message}`);
    } finally {
      if (memoFileRef.current) memoFileRef.current.value = "";
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-lg text-sm font-medium text-slate-200 transition-all shadow-sm group"
      >
        <Database className="h-4 w-4 mr-2 text-purple-400 group-hover:text-purple-300 transition-colors" />
        Data
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden border border-slate-700">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              onClick={() => matchFileRef.current?.click()}
            >
              <FileUp className="mr-3 h-4 w-4 text-blue-400" />
              Import Match JSON
            </button>
            <button
              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              onClick={() => memoFileRef.current?.click()}
            >
              <Upload className="mr-3 h-4 w-4 text-green-400" />
              Import Memos
            </button>
            <button
              className="flex items-center w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              onClick={handleExportMemos}
            >
              <Download className="mr-3 h-4 w-4 text-orange-400" />
              Export Memos
            </button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={matchFileRef}
        accept=".json"
        className="hidden"
        onChange={handleImportMatch}
      />
      <input
        type="file"
        ref={memoFileRef}
        accept=".json"
        className="hidden"
        onChange={handleImportMemos}
      />
    </div>
  );
}
