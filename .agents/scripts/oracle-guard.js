// oracle-guard.js
// Layer 2 (src/**, extension/**) へのGMのview_fileアクセスをログ警告として記録するフック。
// ハードブロックは行わず、違反をメトリクスに記録してオーナーが品質トレンドを確認できるようにする。

const fs = require('node:fs');
const path = require('node:path');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const data = JSON.parse(input);

  const toolName = data.toolCall?.name || '';
  const filePath = data.toolCall?.args?.AbsolutePath || data.toolCall?.args?.TargetFile || '';

  // view_file または grep_search の場合のみチェック
  if (toolName !== 'view_file' && toolName !== 'grep_search') {
    console.log(JSON.stringify({ decision: 'allow' }));
    process.exit(0);
  }

  // Token Guard: view_fileの行数制限 (最大50行)
  if (toolName === 'view_file') {
    const startLine = data.toolCall?.args?.StartLine;
    const endLine = data.toolCall?.args?.EndLine;
    
    if (startLine === undefined || endLine === undefined) {
       console.log(JSON.stringify({ decision: 'deny', reason: '[TOKEN GUARD] view_fileでの全行読み込みは禁止されています。必ず StartLine と EndLine を指定して最大50行に制限するか、AST抽出には `rtk smart <file>` を使用してください。' }));
       process.exit(0);
    }
    
    if (endLine - startLine > 50) {
       console.log(JSON.stringify({ decision: 'deny', reason: '[TOKEN GUARD] 1回の view_file 読み込みは50行以内に制限されています。範囲を絞るか、AST抽出には `rtk smart <file>` を使用してください。' }));
       process.exit(0);
    }
  }

  // Layer 2 パターン: src/ または extension/ 配下のソースファイル
  const LAYER2_PATTERNS = [
    /\/src\/(?!\.agents|AGENTS\.md)/,
    /\/extension\/(?!\.agents)/,
  ];

  // エージェント設定ファイルは許可（SKILL.md, AGENTS.md等）
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
    // ログ記録（警告のみ、ブロックしない）
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
        violation: 'LAYER2_ACCESS_BY_GM',
      });
      fs.appendFileSync(logFile, entry + '\n');
    } catch (_logErr) {
      // ログ書き込み失敗は無視
    }

    // 警告を出力するが実行は許可（ハードブロックしない）
    console.log(
      JSON.stringify({
        decision: 'allow',
        reason:
          '[ORACLE GUARD WARNING] GM is accessing Layer 2 (source code). This violates the Pure Orchestration policy. Violation logged to .regista/metrics/oracle-violations.jsonl. GM should delegate exploration to regista-scout.',
      }),
    );
  } else {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
} catch (_e) {
  console.log(JSON.stringify({ decision: 'allow' }));
}
