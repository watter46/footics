/**
 * scan-matches.ts — サーバー専用モジュール
 *
 * public/data/ に存在する match_*.json を Node.js fs で列挙・パースし、
 * 一覧表示に必要なサマリーを返す。
 * "use server" は付けない（Next.js RSC は自動的にサーバー側で実行される）。
 */

import fs from "fs";
import path from "path";
import type { MatchRoot } from "@/types";

export interface MatchSummary {
  id: string;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  date: string;
  score: string;
  matchType: "club" | "national";
}

export function scanMatchFiles(): MatchSummary[] {
  const baseDir = path.join(process.cwd(), "public");
  const dataDirs = [
    { dir: path.join(baseDir, "data"), type: "club" as const },
    { dir: path.join(baseDir, "national_data"), type: "national" as const },
  ];

  const summaries: MatchSummary[] = [];

  for (const { dir, type } of dataDirs) {
    let files: string[];
    try {
      files = fs.readdirSync(dir);
    } catch {
      continue;
    }

    const matchFiles = files.filter((f) => f.startsWith("match_") && f.endsWith(".json"));

    for (const file of matchFiles) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        const matchId = file.replace("match_", "").replace(".json", "");
        
        if (type === "club") {
          const data = JSON.parse(raw) as MatchRoot;
          const mc = data.matchCentreData;
          if (mc) {
            summaries.push({
              id: String(data.matchId),
              homeTeam: { id: mc.home.teamId, name: mc.home.name },
              awayTeam: { id: mc.away.teamId, name: mc.away.name },
              date: mc.startTime ? mc.startTime.split("T")[0] : "",
              score: mc.score,
              matchType: type,
            });
          }
        } else {
          // National matches
          // Format from match_1966204.json
          const data = JSON.parse(raw);
          if (
            data.initialMatchDataForScrappers &&
            data.initialMatchDataForScrappers[0] &&
            data.initialMatchDataForScrappers[0][0]
          ) {
            const mData = data.initialMatchDataForScrappers[0][0];
            const homeName = mData[2];
            const awayName = mData[3];
            let score = mData[12];
            if (!score || score.includes("null")) {
              score = mData[18] || "0 : 0"; 
            }
            
            let date = "";
            if (mData[4]) {
              const [datePart] = mData[4].split(" ");
              if (datePart) {
                const parts = datePart.split("/");
                if (parts.length === 3) {
                  date = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
              }
            }
            
            summaries.push({
              id: matchId,
              homeTeam: { id: mData[0] || parseInt(matchId), name: homeName },
              awayTeam: { id: mData[1] || parseInt(matchId)+1, name: awayName },
              date: date,
              score: score,
              matchType: type,
            });
          }
        }
      } catch (err) {
        console.warn(`[footics] Failed to parse ${file} in ${type}:`, err);
      }
    }
  }

  return summaries;
}
