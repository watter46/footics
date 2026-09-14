const fs = require('fs');

function main() {
  const input = fs.readFileSync(0, 'utf-8');
  if (!input) return;

  const payload = JSON.parse(input);
  const toolCall = payload.toolCall || {};
  const args = toolCall.args || {};

  // エージェント情報の抽出
  const role =
    payload.subagentRole ||
    payload.role ||
    payload.subagentType ||
    payload.typeName ||
    '';
  const isSubagent = Boolean(
    payload.isSubagent || payload.subagentConversationId || role,
  );

  const response = {
    decision: 'allow',
  };

  // 1. ファイル編集・作成ガード (write_to_file / replace_file_content)
  if (
    toolCall.name === 'write_to_file' ||
    toolCall.name === 'replace_file_content'
  ) {
    const targetFile = args.TargetFile || '';

    // システムパス定義 (メタエージェント専権)
    const isSystemPath =
      targetFile.includes('/.agents/') ||
      targetFile.includes('/scripts/') ||
      targetFile.includes('Makefile') ||
      targetFile.endsWith('/biome.json') ||
      targetFile.endsWith('/package.json') ||
      targetFile.endsWith('/tsconfig.json');

    // A. サブエージェントによるシステムファイル改変の絶対拒否 (Deny)
    if (isSystemPath && isSubagent) {
      response.decision = 'deny';
      response.reason = `[Regista Security] サブエージェント (${role || 'Worker/GM'}) からのシステムファイル (${targetFile}) 編集は拒否されました。システム構成やスクリプトの変更権限は最高システムアーキテクト（メタエージェント）のみに制限されています。`;
      console.log(JSON.stringify(response));
      return;
    }

    // B. Worker / GM ごとのスコープ境界（ホワイトリスト）検証
    if (role) {
      const normalizedRole = role.toLowerCase();

      // regista-gm: specs/ のみ編集可能
      if (
        normalizedRole.includes('gm') ||
        normalizedRole.includes('regista-gm')
      ) {
        const isSpecPath =
          targetFile.includes('/specs/') || targetFile.startsWith('specs/');
        if (!isSpecPath) {
          response.decision = 'deny';
          response.reason = `[Regista Security] Regista-GM はプロダクトコード (${targetFile}) を直接編集できません。仕様書 (specs/**) の策定と Worker へのタスク委譲を行ってください。`;
          console.log(JSON.stringify(response));
          return;
        }
      }

      // worker-canvas: canvas / 2d描画領域のみ
      if (normalizedRole.includes('canvas')) {
        const isCanvasPath =
          targetFile.includes('/canvas/') ||
          targetFile.includes('/video-canvas/');
        if (!isCanvasPath) {
          response.decision = 'deny';
          response.reason = `[Regista Security] worker-canvas の担当スコープ外 (${targetFile}) への書き込みは拒否されました。許可パス: canvas関連ディレクトリ`;
          console.log(JSON.stringify(response));
          return;
        }
      }

      // worker-data: db / store / types / lib 領域のみ
      if (normalizedRole.includes('data')) {
        const isDataPath =
          targetFile.includes('/lib/') ||
          targetFile.includes('/stores/') ||
          targetFile.includes('/types/');
        if (!isDataPath) {
          response.decision = 'deny';
          response.reason = `[Regista Security] worker-data の担当スコープ外 (${targetFile}) への書き込みは拒否されました。許可パス: src/lib/**, src/stores/**, src/types/**`;
          console.log(JSON.stringify(response));
          return;
        }
      }

      // worker-extension: extension/ 領域のみ
      if (normalizedRole.includes('extension')) {
        const isExtensionPath =
          targetFile.includes('/extension/') ||
          targetFile.startsWith('extension/');
        if (!isExtensionPath) {
          response.decision = 'deny';
          response.reason = `[Regista Security] worker-extension の担当スコープ外 (${targetFile}) への書き込みは拒否されました。許可パス: extension/**`;
          console.log(JSON.stringify(response));
          return;
        }
      }

      // worker-frontend: app / ui / components 領域
      if (normalizedRole.includes('frontend')) {
        const isFrontendPath =
          targetFile.includes('/app/') ||
          targetFile.includes('/components/ui/') ||
          targetFile.includes('/styles/');
        if (!isFrontendPath) {
          response.decision = 'deny';
          response.reason = `[Regista Security] worker-frontend の担当スコープ外 (${targetFile}) への書き込みは拒否されました。許可パス: src/app/**, src/components/ui/**, src/styles/**`;
          console.log(JSON.stringify(response));
          return;
        }
      }
    }
  }

  // 2. コマンド実行ガード (run_command)
  if (toolCall.name === 'run_command') {
    const cmd = (args.CommandLine || '').trim();

    // A. 破壊的コマンドの完全拒否
    if (
      cmd.includes('rm -rf /') ||
      cmd.includes('git reset --hard') ||
      cmd.includes('git push --force') ||
      cmd.includes('git clean -fdx')
    ) {
      response.decision = 'deny';
      response.reason =
        '[Regista Security] 破壊的コマンドの実行はブロックされました。';
      console.log(JSON.stringify(response));
      return;
    }

    // B. サブエージェントにおける rtk ラッパー強制 (vitest, biome, tsc, pnpm verify 等)
    if (isSubagent) {
      const targetsNeedingRtk = [
        /^vitest\b/,
        /^pnpm\s+(test|verify|biome|type-check)/,
        /^tsc\b/,
        /^biome\b/,
        /^rg\b/,
        /^git\s+(diff|status|log)\b/,
      ];

      const needsRtk = targetsNeedingRtk.some((pattern) => pattern.test(cmd));
      if (needsRtk && !cmd.startsWith('rtk ')) {
        response.decision = 'deny';
        response.reason = `[Regista Token Guard] トークン最適化のため、コマンド実行は必ず 'rtk' 経由で行ってください。(推奨: 'rtk ${cmd}')`;
        console.log(JSON.stringify(response));
        return;
      }
    }
  }

  console.log(JSON.stringify(response));
}

main();
