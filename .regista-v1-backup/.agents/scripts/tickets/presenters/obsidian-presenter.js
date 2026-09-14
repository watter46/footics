/**
 * obsidian-presenter.js
 *
 * Obsidian Vault 向けの Frontmatter / Callout 付きマークダウンを生成するプレゼンター
 */

function presentObsidianTicket(ticket) {
  let md = `---\n`;
  md += `id: "${ticket.id}"\n`;
  md += `title: "${ticket.title}"\n`;
  md += `phase: "${ticket.phase}"\n`;
  md += `domain: "${ticket.domain}"\n`;
  md += `assignee: "${ticket.assignee}"\n`;
  md += `status: "${ticket.status}"\n`;
  md += `tags:\n`;
  md += `  - regista/ticket\n`;
  md += `  - status/${ticket.status.toLowerCase()}\n`;
  md += `---\n\n`;

  md += `# ${ticket.title} (${ticket.id})\n\n`;

  md += `> [!INFO] ユーザー体験の変化 (UX Impact)\n`;
  md += `> ${ticket.user_experience_impact}\n\n`;

  md += `## 🎯 変更対象ファイル\n`;
  for (const f of ticket.target_files) {
    md += `- \`${f}\`\n`;
  }
  md += `\n`;

  md += `## 📋 詳細仕様\n`;
  for (const s of ticket.detailed_spec) {
    md += `1. ${s}\n`;
  }
  md += `\n`;

  md += `## 🧪 検証コマンド\n`;
  md += `- **Lint**: \`${ticket.verification_commands.biome}\`\n`;
  md += `- **型検査**: \`${ticket.verification_commands.type_check}\`\n`;
  if (ticket.verification_commands.vitest) {
    md += `- **テスト**: \`${ticket.verification_commands.vitest}\`\n`;
  }
  md += `\n`;

  return md;
}

module.exports = { presentObsidianTicket };
