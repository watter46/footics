/**
 * board-markdown-presenter.js
 * 
 * GitHub / プロジェクト内 REGISTA_BOARD.md 向けのマークダウンを生成するプレゼンター
 */

function presentBoardMarkdown(board) {
  let md = `# Regista Management Board\n\n`;
  md += `> **Source of Truth**: \`.regista/board.json\` (Last Updated: ${board.last_updated})\n\n`;
  
  md += `## 1. [Active Focus]\n`;
  md += `- **【${board.active_focus.phase_name}】**:\n`;
  md += `  - **目的 & 課題**: ${board.active_focus.objective}\n\n`;

  md += `## 2. [Task Matrix]\n\n`;
  md += `| Ticket ID | タスク名 | 担当 | 対象ファイル | ユーザー体験の変化 (UX Impact) | ステータス |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const t of board.tickets) {
    const statusEmoji = t.status === 'DONE' ? 'DONE ✅' : (t.status === 'IN_PROGRESS' ? 'IN_PROGRESS 🔄' : (t.status === 'REVIEW_QA' ? 'REVIEW_QA 🔍' : 'TODO ⏳'));
    const files = t.target_files.map(f => `\`${f}\``).join('<br>');
    md += `| **${t.id}** | ${t.title} | \`${t.assignee}\` | ${files} | ${t.user_experience_impact} | **${statusEmoji}** |\n`;
  }
  md += `\n`;

  md += `## 3. [Active Ticket Details (自己完結チケット詳細)]\n\n`;
  for (const t of board.tickets) {
    if (t.status !== 'DONE') {
      md += `### 🎫 [${t.id}] ${t.title}\n`;
      md += `- **担当**: \`${t.assignee}\` | **ドメイン**: ${t.domain} | **ステータス**: \`${t.status}\`\n`;
      md += `- **変更対象ファイル**:\n`;
      for (const f of t.target_files) {
        md += `  - \`${f}\`\n`;
      }
      md += `- **変更後のユーザー体験**:\n`;
      md += `  - ${t.user_experience_impact}\n`;
      md += `- **詳細仕様 & 実装手順**:\n`;
      for (const s of t.detailed_spec) {
        md += `  1. ${s}\n`;
      }
      md += `- **検証コマンド**:\n`;
      md += `  - Lint: \`${t.verification_commands.biome}\`\n`;
      md += `  - 型検査: \`${t.verification_commands.type_check}\`\n`;
      if (t.verification_commands.vitest) {
        md += `  - テスト: \`${t.verification_commands.vitest}\`\n`;
      }
      md += `- **実行用プロンプト (別会話起動用)**:\n`;
      md += `\`\`\`text\n${t.execution_prompt}\n\`\`\`\n\n`;
    }
  }

  md += `## 4. [Completion History (完了実績ログ)]\n\n`;
  const completedTickets = board.tickets.filter(t => t.status === 'DONE' && t.completed_at).reverse();
  for (const t of completedTickets) {
    md += `- **${t.completed_at.slice(0, 10)}**: [${t.id} Complete: ${t.title}]\n`;
    if (t.completion_summary && t.completion_summary.length > 0) {
      for (let i = 0; i < t.completion_summary.length; i++) {
        md += `  ${i + 1}. ${t.completion_summary[i]}\n`;
      }
    } else {
      md += `  - ユーザー体験: ${t.user_experience_impact}\n`;
    }
    md += `\n`;
  }

  return md;
}

module.exports = { presentBoardMarkdown };
