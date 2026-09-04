#!/usr/bin/env node

/**
 * sync-board.js
 *
 * Regista Management Board JSON & Presenter-based Sync Engine
 *
 * Usage:
 *   node .agents/scripts/sync-board.js check              # Validate board against schema
 *   node .agents/scripts/sync-board.js render             # Render Markdown from JSON
 *   node .agents/scripts/sync-board.js chat [status]      # Output compact 3-column table for Chat
 *   node .agents/scripts/sync-board.js update <id> <status> [summary...] # Update ticket status
 */

const fs = require('fs');
const path = require('path');
const {
  presentBoardMarkdown,
} = require('./presenters/board-markdown-presenter');
const { presentChatTable } = require('./presenters/chat-presenter');

const BOARD_JSON_PATH = path.resolve(process.cwd(), '.regista/board.json');
const BOARD_MD_PATH = path.resolve(process.cwd(), 'agents/REGISTA_BOARD.md');

function loadBoardJson() {
  if (!fs.existsSync(BOARD_JSON_PATH)) {
    throw new Error(`Board JSON not found at ${BOARD_JSON_PATH}`);
  }
  return JSON.parse(fs.readFileSync(BOARD_JSON_PATH, 'utf-8'));
}

function saveBoardJson(board) {
  board.last_updated = new Date().toISOString();
  fs.writeFileSync(
    BOARD_JSON_PATH,
    JSON.stringify(board, null, 2) + '\n',
    'utf-8',
  );
}

const action = process.argv[2];

if (action === 'check') {
  const board = loadBoardJson();
  console.log(
    `[STATUS] Board JSON valid. Total tickets: ${board.tickets.length}`,
  );
} else if (action === 'render') {
  const board = loadBoardJson();
  const md = presentBoardMarkdown(board);
  fs.writeFileSync(BOARD_MD_PATH, md, 'utf-8');
  console.log(`[STATUS] Rendered ${BOARD_MD_PATH} successfully via Presenter.`);
} else if (action === 'chat') {
  const statusFilter = process.argv[3] || null;
  const board = loadBoardJson();
  console.log(presentChatTable(board.tickets, statusFilter));
} else if (action === 'update') {
  const id = process.argv[3];
  const newStatus = process.argv[4];
  const summaryArgs = process.argv.slice(5);

  if (!id || !newStatus) {
    console.error(
      'Usage: node sync-board.js update <id> <TODO|IN_PROGRESS|REVIEW_QA|DONE> [summary points...]',
    );
    process.exit(1);
  }

  const board = loadBoardJson();
  const ticket = board.tickets.find(
    (t) =>
      t.id.toLowerCase() === id.toLowerCase() ||
      t.id.replace(/-/g, '').toLowerCase() ===
        id.replace(/-/g, '').toLowerCase(),
  );

  if (!ticket) {
    console.error(`Ticket ${id} not found.`);
    process.exit(1);
  }

  ticket.status = newStatus;
  if (newStatus === 'DONE') {
    ticket.completed_at = new Date().toISOString();
    if (summaryArgs.length > 0) {
      ticket.completion_summary = summaryArgs;
    }
  }

  saveBoardJson(board);
  const md = presentBoardMarkdown(board);
  fs.writeFileSync(BOARD_MD_PATH, md, 'utf-8');
  console.log(
    `[STATUS] Updated ticket ${ticket.id} to ${newStatus} in board.json and REGISTA_BOARD.md`,
  );
} else {
  console.log('Available commands: check, render, chat, update');
}
