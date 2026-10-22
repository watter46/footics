import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  brainDir as defaultBrainDir,
  findChildSubagentIds,
  parseJsonl,
  type TranscriptRecord,
} from '../../audit-session';

export interface SessionNode {
  sessionId: string;
  depth: number;
  records: TranscriptRecord[];
}

export interface CollectTreeOptions {
  maxDepth?: number;
  brainDir?: string;
}

export function collectSessionTree(
  rootId: string,
  opts?: CollectTreeOptions,
): SessionNode[] {
  const maxDepth = opts?.maxDepth ?? 3;
  const baseBrainDir = opts?.brainDir ?? defaultBrainDir();

  const rel = '.system_generated/logs/transcript.jsonl';
  const nodes: SessionNode[] = [];
  const visited = new Set<string>();

  const queue: Array<{ id: string; depth: number }> = [
    { id: rootId, depth: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const { id, depth } = current;
    if (visited.has(id)) continue;
    visited.add(id);

    const transcriptPath = path.join(baseBrainDir, id, rel);
    if (!fs.existsSync(transcriptPath)) {
      continue;
    }

    let records: TranscriptRecord[] = [];
    try {
      const raw = fs.readFileSync(transcriptPath, 'utf8');
      records = parseJsonl(raw);
    } catch {
      continue;
    }

    nodes.push({
      sessionId: id,
      depth,
      records,
    });

    if (depth < maxDepth) {
      const childIds = findChildSubagentIds(records, 0);
      for (const childId of childIds) {
        if (!visited.has(childId)) {
          queue.push({ id: childId, depth: depth + 1 });
        }
      }
    }
  }

  return nodes;
}
