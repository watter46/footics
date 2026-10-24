import * as fs from 'fs';
import * as path from 'path';

export type AgentRole =
  | 'planner'
  | 'worker'
  | 'reviewer'
  | 'scout'
  | 'auditor'
  | 'unknown';

export interface AgentAccessDecision {
  decision: 'allow' | 'deny';
  reason?: string;
}

/**
 * 先頭ステップ（初回メッセージ）のオブジェクトからロールを判定する純粋関数
 */
export function detectRoleFromFirstStep(firstStep: {
  type?: string;
  content?: string;
}): AgentRole {
  if (!firstStep) return 'unknown';

  const content = firstStep.content || '';

  // 1. Auditor: 子セッションの AUDIT_REQUEST、または親チャットの @auditor / AUDIT_REQUEST / ai:audit 指定
  if (
    content.includes('type: "AUDIT_REQUEST"') ||
    content.includes("type: 'AUDIT_REQUEST'") ||
    /@auditor\b/i.test(content) ||
    /\bai:audit\b/i.test(content)
  ) {
    return 'auditor';
  }

  // 2. Scout: SCOUT_REQUEST
  if (
    content.includes('type: "SCOUT_REQUEST"') ||
    content.includes("type: 'SCOUT_REQUEST'")
  ) {
    return 'scout';
  }

  // 3. Reviewer: REVIEW_REQUEST
  if (
    content.includes('type: "REVIEW_REQUEST"') ||
    content.includes("type: 'REVIEW_REQUEST'")
  ) {
    return 'reviewer';
  }

  // 4. Worker: TASK_ASSIGN または Worker 指示
  if (
    content.includes('type: "TASK_ASSIGN"') ||
    content.includes("type: 'TASK_ASSIGN'") ||
    content.includes('Worker エージェント') ||
    content.includes('あなたは Footics プロジェクトの Worker')
  ) {
    return 'worker';
  }

  if (firstStep.type === 'USER_INPUT') {
    return 'planner';
  }

  return 'planner';
}

/**
 * transcriptPath のセッションが親セッションではなく子サブエージェントであるかを判定する。
 * 子サブエージェントは必ず親からの初期メッセージ（SYSTEM_MESSAGE）で開始される。
 * USER_INPUT から開始するセッション（親セッション）や、パス不在・パース不能時は false を返す。
 */
export function isChildSession(transcriptPath?: string): boolean {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return false;
  }
  try {
    const text = fs.readFileSync(transcriptPath, 'utf8');
    const firstLine = text.trim().split('\n')[0];
    if (!firstLine) return false;
    const firstStep = JSON.parse(firstLine);
    return firstStep.type === 'SYSTEM_MESSAGE';
  } catch (_e) {
    return false;
  }
}

/**
 * transcript.jsonl の先頭（初回メッセージ）を読み取り、実行中のエージェントロールを判別する。
 * サブエージェントの場合、親から送られた初回メッセージ（SYSTEM_MESSAGE）に
 * type: "AUDIT_REQUEST" (Auditor), type: "TASK_ASSIGN" (Worker),
 * type: "REVIEW_REQUEST" (Reviewer), または type: "SCOUT_REQUEST" (Scout) が含まれる。
 * transcriptPath が存在しないか未指定の場合は、テスト環境やスタンドアロン実行とみなして 'unknown' を返す。
 * USER_INPUT から開始している場合は親セッション（Planner）と判定する。
 */
export function detectAgentRole(transcriptPath?: string): AgentRole {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return 'unknown';
  }

  try {
    const text = fs.readFileSync(transcriptPath, 'utf8');
    const firstLine = text.trim().split('\n')[0];
    if (!firstLine) return 'unknown';

    const firstStep = JSON.parse(firstLine);
    return detectRoleFromFirstStep(firstStep);
  } catch (_e) {
    return 'unknown';
  }
}

const REPO_ROOT = path.resolve(__dirname, '../../../');

/**
 * ワークスペース相対パスに正規化する
 */
export function normalizeRelativePath(
  targetFile: string,
  workspacePath?: string,
): string {
  const resolved = path.resolve(targetFile);
  const root = workspacePath ? path.resolve(workspacePath) : REPO_ROOT;
  if (resolved.startsWith(root)) {
    return path.relative(root, resolved);
  }
  return path.relative(REPO_ROOT, resolved);
}

export function getTargetFilePath(toolCall: any): string | null {
  if (!toolCall || !toolCall.args) return null;
  const raw = toolCall.args.TargetFile || toolCall.args.Path || '';
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || null;
}

export function isWriteTool(toolName?: string): boolean {
  return (
    toolName === 'replace_file_content' ||
    toolName === 'write_to_file' ||
    toolName === 'edit_file' ||
    toolName === 'write_file'
  );
}

/**
 * エージェントごとのファイル書き込み権限を判定する
 */
export function checkAgentAccessGuard(
  payload: any,
): AgentAccessDecision | null {
  const toolCall = payload.toolCall;
  if (!toolCall || !isWriteTool(toolCall.name)) {
    return null;
  }

  const rawTargetFile = getTargetFilePath(toolCall);
  if (!rawTargetFile) return null;

  const role = detectAgentRole(payload.transcriptPath);
  if (role === 'unknown') {
    return { decision: 'allow' };
  }

  const workspacePath = payload.workspacePaths?.[0];
  const relPath = normalizeRelativePath(rawTargetFile, workspacePath).replace(
    /\\/g,
    '/',
  );

  // 1. Planner（親エージェント）の書き込み制限
  // 許可: tasks/**（タスク管理）、.agents/**（エージェント自身の設定・フック保守）
  // 禁止: src/**, extension/**, tests/** などのプロダクション・テストコードの直接編集
  if (role === 'planner') {
    const isCode =
      relPath.startsWith('src/') ||
      relPath.startsWith('extension/') ||
      relPath.startsWith('tests/');
    if (isCode) {
      return {
        decision: 'deny',
        reason: `[GUARD] Access Denied: Planner is prohibited from editing source code ('${relPath}'). Planner's write scope is strictly limited to 'tasks/**' and '.agents/**'. Please delegate implementation to Worker.`,
      };
    }
    return { decision: 'allow' };
  }

  // 2. Reviewer の書き込み制限: tasks/** のみ許可（審査結果・Fix追記のみ）
  if (role === 'reviewer') {
    const isTaskFile = relPath.startsWith('tasks/');
    if (!isTaskFile) {
      return {
        decision: 'deny',
        reason: `[GUARD] Access Denied: Reviewer is prohibited from editing source code ('${relPath}'). Reviewer's write scope is strictly limited to 'tasks/**'. Please append required fixes to the task file and reject.`,
      };
    }
    return { decision: 'allow' };
  }

  // 2b. Scout の書き込み制限: 完全読み取り専用（いかなるファイルも編集不可）
  if (role === 'scout') {
    return {
      decision: 'deny',
      reason: `[GUARD] Access Denied: Scout is a read-only reconnaissance agent and cannot modify any files ('${relPath}'). Return extracted Context Snippets to Planner via message.`,
    };
  }

  // 2c. Auditor の書き込み制限: tasks/** と .agents/** を許可、プロダクション・テストコードは禁止
  if (role === 'auditor') {
    const isCode =
      relPath.startsWith('src/') ||
      relPath.startsWith('extension/') ||
      relPath.startsWith('tests/');
    if (isCode) {
      return {
        decision: 'deny',
        reason: `[GUARD] Access Denied: Auditor is prohibited from editing production/test code ('${relPath}'). Auditor's write scope is strictly limited to 'tasks/**' and '.agents/**'.`,
      };
    }
    return { decision: 'allow' };
  }

  // 3. Worker の書き込み権限
  if (role === 'worker') {
    // 保護対象: .agents/** は改ざん防止のため禁止
    if (relPath.startsWith('.agents/')) {
      return {
        decision: 'deny',
        reason: `[GUARD] Access Denied: Worker is prohibited from modifying agent definitions or hooks ('${relPath}').`,
      };
    }
    // 保護対象: package.json は無断依存追加防止のため禁止
    if (relPath === 'package.json' || relPath === 'extension/package.json') {
      return {
        decision: 'deny',
        reason: `[GUARD] Access Denied: Worker is prohibited from modifying '${relPath}' without explicit user confirmation.`,
      };
    }

    // 許可対象: src/**, extension/**, tests/**, tasks/**
    const isAllowedScope =
      relPath.startsWith('src/') ||
      relPath.startsWith('extension/') ||
      relPath.startsWith('tests/') ||
      relPath.startsWith('tasks/');

    if (!isAllowedScope) {
      return {
        decision: 'deny',
        reason: `[GUARD] Access Denied: Worker can only modify files in 'src/', 'extension/', 'tests/', or 'tasks/' ('${relPath}').`,
      };
    }

    return { decision: 'allow' };
  }

  return { decision: 'allow' };
}
