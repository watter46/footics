// oracle-guard.js
// Layer 2 (src/**, extension/**) へのRead/Writeアクセスを物理遮断（deny）するPreToolUseガードフック。

const fs = require('node:fs');
const path = require('node:path');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const data = JSON.parse(input);

  const toolName = data.toolCall?.name || '';
  const args = data.toolCall?.args || {};

  // 対象ツール: view_file, grep_search, write_to_file, replace_file_content
  const TARGET_TOOLS = ['view_file', 'grep_search', 'write_to_file', 'replace_file_content'];
  if (!TARGET_TOOLS.includes(toolName)) {
    console.log(JSON.stringify({ decision: 'allow' }));
    process.exit(0);
  }

  const filePath = args.AbsolutePath || args.TargetFile || args.SearchPath || '';

  // Token Guard: view_fileの行数制限 (最大50行)
  if (toolName === 'view_file') {
    const startLine = args.StartLine;
    const endLine = args.EndLine;

    if (startLine === undefined || endLine === undefined) {
      console.log(
        JSON.stringify({
          decision: 'deny',
          reason:
            '[TOKEN GUARD] view_fileでの全行読み込みは禁止されています。必ず StartLine と EndLine を指定して最大50行に制限するか、AST抽出には `rtk smart <file>` を使用してください。',
        }),
      );
      process.exit(0);
    }

    if (endLine - startLine > 50) {
      console.log(
        JSON.stringify({
          decision: 'deny',
          reason:
            '[TOKEN GUARD] 1回の view_file 読み込みは50行以内に制限されています。範囲を絞るか、AST抽出には `rtk smart <file>` を使用してください。',
        }),
      );
      process.exit(0);
    }
  }

  // Layer 2 パターン: src/ または extension/ 配下のソースファイル
  const LAYER2_PATTERNS = [
    /(?:^|\/)(src|extension)(?:\/|$)/,
  ];

  // 例外許可パターン（エージェント設定ファイル、規約等）
  const ALLOWED_EXCEPTIONS = [
    /\.agents\/skills\//,
    /\.agents\/knowledge\//,
    /AGENTS\.md$/,
    /ORGANIZATION\.md$/,
    /\.regista\//,
  ];

  const isLayer2 = LAYER2_PATTERNS.some((p) => p.test(filePath));
  const isAllowed = ALLOWED_EXCEPTIONS.some((p) => p.test(filePath));

  if (isLayer2 && !isAllowed) {
    // ログ記録
    const logDir = path.join(__dirname, '../../.regista/metrics');
    const logFile = path.join(logDir, 'oracle-violations.jsonl');

    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        tool: toolName,
        file: filePath,
        violation: 'LAYER2_ACCESS_BLOCKED',
      });
      fs.appendFileSync(logFile, entry + '\n');
    } catch (_logErr) {
      // ログ書き込み失敗は無視
    }

    // ハードブロック (decision: deny)
    const actionType = (toolName === 'write_to_file' || toolName === 'replace_file_content') ? '書き込み (Write)' : '閲覧・検索 (Read)';
    console.log(
      JSON.stringify({
        decision: 'deny',
        reason: `[ORACLE GUARD VIOLATION] Layer 2 (src/**, extension/**) への直接${actionType}は規約により完全遮断（Deny）されています。\n- 対象: ${filePath}\n- ガイドライン: コード探索は必ず \`regista-scout\` に委譲し、キャッシュ・チケットのみを参照してください。`,
      }),
    );
  } else {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
} catch (_e) {
  console.log(JSON.stringify({ decision: 'allow' }));
}
