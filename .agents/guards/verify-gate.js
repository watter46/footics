const fs = require('fs');
const { execSync } = require('child_process');

function main() {
  const input = fs.readFileSync(0, 'utf-8');
  if (!input) return;

  const payload = JSON.parse(input);
  
  // 終了しようとしている場合のみ検証
  if (payload.terminationReason === 'model_stop') {
    try {
      // 変更差分があるかチェック
      const diff = execSync('git diff --name-only', { encoding: 'utf-8' }).trim();
      
      if (diff) {
        // ここで scoped-check などを呼び出す
        // 例: execSync('pnpm verify', { stdio: 'inherit' });
        // エラーになれば catch に飛ぶ
      }
      
      console.log(JSON.stringify({ decision: "allow" }));
    } catch (err) {
      console.log(JSON.stringify({
        decision: "continue",
        reason: "検証ゲート(pnpm verify)でエラーが検出されました。エラーを修正してから再度完了を試みてください。\n" + err.message
      }));
    }
  } else {
    console.log(JSON.stringify({ decision: "allow" }));
  }
}

main();
