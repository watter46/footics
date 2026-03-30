import JSZip from "jszip";
import { 
  getAllEventMemos, 
  getAllCustomEvents, 
  putEventMemo, 
  saveCustomEvent,
  getDatabase 
} from "./db";
import { 
  getAllCacheEntries, 
  openCacheDB, 
  idbPut, 
  CacheEntry 
} from "./duckdb/data-loader";

const BACKUP_VERSION = 1;

/**
 * 全データを ZIP 形式でエクスポートする
 */
export async function exportAllDataZip(): Promise<void> {
  const zip = new JSZip();
  
  // 1. Memos & Custom Events
  const [eventMemos, customEvents] = await Promise.all([
    getAllEventMemos(),
    getAllCustomEvents()
  ]);
  
  zip.file("memos.json", JSON.stringify({
    event_memos: eventMemos,
    custom_events: customEvents
  }, null, 2));

  // 2. Match Cache (Parquet & Metadata)
  const cacheEntries = await getAllCacheEntries();
  const matchMetadataList: any[] = [];
  
  const parquetFolder = zip.folder("parquet");
  
  for (const entry of cacheEntries) {
    const matchId = entry.key.replace("match_", "");
    matchMetadataList.push({
      key: entry.key,
      version: entry.value.version,
      metadata: entry.value.metadata
    });
    
    if (parquetFolder) {
      parquetFolder.file(`${matchId}_matches.parquet`, entry.value.matchesParquet);
      parquetFolder.file(`${matchId}_players.parquet`, entry.value.playersParquet);
      parquetFolder.file(`${matchId}_events.parquet`, entry.value.eventsParquet);
    }
  }
  
  zip.file("matches.json", JSON.stringify(matchMetadataList, null, 2));

  // 3. Manifest
  zip.file("manifest.json", JSON.stringify({
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    matchCount: cacheEntries.length
  }, null, 2));

  // 4. Generate & Download
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  
  anchor.href = url;
  anchor.download = `footics_backup_${dateStr}.zip`;
  anchor.click();
  
  URL.revokeObjectURL(url);
}

/**
 * ZIP ファイルから全データを復元（マージ）する
 */
export async function importAllDataZip(file: File): Promise<{ matchCount: number; memoCount: number }> {
  const zip = await JSZip.loadAsync(file);
  
  // 1. Check Manifest
  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("Invalid backup: manifest.json missing");
  const manifest = JSON.parse(await manifestFile.async("string"));
  
  // 2. Import Memos
  let memoCount = 0;
  const memosFile = zip.file("memos.json");
  if (memosFile) {
    const memosData = JSON.parse(await memosFile.async("string"));
    
    // Event Memos
    if (Array.isArray(memosData.event_memos)) {
      for (const m of memosData.event_memos) {
        await putEventMemo(m);
        memoCount++;
      }
    }
    
    // Custom Events
    if (Array.isArray(memosData.custom_events)) {
      for (const e of memosData.custom_events) {
        await saveCustomEvent(e);
        memoCount++;
      }
    }
  }

  // 3. Import Match Cache
  let matchCount = 0;
  const matchesFile = zip.file("matches.json");
  if (matchesFile) {
    const matchesList = JSON.parse(await matchesFile.async("string"));
    const idb = await openCacheDB();
    
    for (const mInfo of matchesList) {
      const matchId = mInfo.key.replace("match_", "");
      
      const pMatches = zip.file(`parquet/${matchId}_matches.parquet`);
      const pPlayers = zip.file(`parquet/${matchId}_players.parquet`);
      const pEvents = zip.file(`parquet/${matchId}_events.parquet`);
      
      if (pMatches && pPlayers && pEvents) {
        const entry: CacheEntry = {
          version: mInfo.version,
          metadata: mInfo.metadata,
          matchesParquet: await pMatches.async("arraybuffer"),
          playersParquet: await pPlayers.async("arraybuffer"),
          eventsParquet: await pEvents.async("arraybuffer"),
        };
        
        await idbPut(idb, mInfo.key, entry);
        matchCount++;
      }
    }
  }

  return { matchCount, memoCount };
}
