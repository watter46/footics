const fs = require('fs');

function main() {
  const input = fs.readFileSync(0, 'utf-8');
  if (!input) return;

  const payload = JSON.parse(input);
  const toolCall = payload.toolCall;
  const args = toolCall.args;

  // デフォルトは許可
  const response = {
    decision: "allow"
  };

  if (toolCall.name === 'write_to_file' || toolCall.name === 'replace_file_content') {
    const targetFile = args.TargetFile || '';
    
    // システムファイルの保護 (メタエージェントのみが編集すべきパス)
    const isSystemPath = targetFile.includes('/.agents/') || targetFile.includes('/scripts/') || targetFile.includes('Makefile');
    
    // NOTE: 厳密なエージェント判定は transcript の解析等が必要なため、
    // 現在はパスベースでの保護と、Workerへの警告を主目的とする。
    if (isSystemPath) {
       // メタエージェント（あなた）自身もブロックされないように、
       // 警告メッセージを出す設定にするか、ask にして人間に確認させる
       response.decision = "ask";
       response.reason = "Registaのシステムファイル (.agents, scripts, Makefile) を編集しようとしています。これは最高システムアーキテクト（メタエージェント）のみに許可されています。";
    }
    
    // 各 Worker のホワイトリスト制約
    // 理想的には payload.modelName や環境変数から起動元のエージェント(worker-frontend等)を特定し、
    // 担当外のパス (例: frontend が src/lib/db に書き込む) の場合は decision: "deny" とする。
  } else if (toolCall.name === 'run_command') {
    const cmd = args.CommandLine || '';
    if (cmd.includes('rm -rf /') || cmd.includes('git reset --hard') || cmd.includes('git push --force')) {
      response.decision = "deny";
      response.reason = "破壊的コマンドの実行はブロックされました。";
    }
  }

  console.log(JSON.stringify(response));
}

main();
