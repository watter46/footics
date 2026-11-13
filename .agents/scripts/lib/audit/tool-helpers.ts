import type { TranscriptRecord } from '../../audit-session';

export interface ToolCallLike {
  name: string;
  args?: Record<string, unknown>;
}

export function isReadToolName(name?: string): boolean {
  return name === 'read_file' || name === 'view_file';
}

export function isEditToolName(name?: string): boolean {
  return name === 'edit_file' || name === 'replace_file_content';
}

export function isWriteToolName(name?: string): boolean {
  return name === 'write_file' || name === 'write_to_file';
}

export function isModifyToolName(name?: string): boolean {
  return isEditToolName(name) || isWriteToolName(name);
}

export function extractTargetFile(tc: ToolCallLike): string {
  const raw =
    tc.args?.Path ??
    tc.args?.AbsolutePath ??
    tc.args?.TargetFile ??
    tc.args?.file ??
    '';
  return String(raw)
    .trim()
    .replace(/^["']|["']$/g, '');
}

export function extractWriteContent(tc: ToolCallLike): string {
  const raw =
    tc.args?.Replacement ??
    tc.args?.ReplacementContent ??
    tc.args?.Content ??
    tc.args?.CodeContent ??
    '';
  return String(raw);
}

/**
 * 並列 tool_calls を考慮し、records[plannerIdx] の toolCallIdx 番目に対応する
 * GENERIC 結果レコードを返す。
 */
export function findToolResultRecord(
  records: TranscriptRecord[],
  plannerIdx: number,
  toolCallIdx = 0,
): TranscriptRecord | undefined {
  let genericCount = 0;
  for (let j = plannerIdx + 1; j < records.length; j++) {
    const rec = records[j];
    if (
      rec.type === 'PLANNER_RESPONSE' ||
      rec.type === 'USER_INPUT' ||
      rec.type === 'SYSTEM_MESSAGE'
    ) {
      break;
    }
    if (rec.type === 'GENERIC') {
      if (genericCount === toolCallIdx) {
        return rec;
      }
      genericCount++;
    }
  }
  return undefined;
}
