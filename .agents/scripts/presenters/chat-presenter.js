/**
 * chat-presenter.js
 * 
 * 人間が見やすい極小3列テーブル（チケット番号 / タスク名 / 変更後のUX）を出力するプレゼンター
 */

function presentChatTable(tickets, filterStatus = null) {
  const targetTickets = filterStatus 
    ? tickets.filter(t => t.status === filterStatus)
    : tickets;

  if (targetTickets.length === 0) {
    return '該当するチケットはありません。';
  }

  let table = '| チケット番号 | タスク名 (日本語) | 変更後のユーザー体験 (UX Impact) |\n';
  table += '| :--- | :--- | :--- |\n';

  for (const t of targetTickets) {
    table += `| **${t.id}** | ${t.title} | ${t.user_experience_impact} |\n`;
  }

  return table;
}

module.exports = { presentChatTable };
