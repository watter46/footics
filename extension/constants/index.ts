/**
 * Footics Extension Constants
 */

export const FOOTICS_APP_URLS = [
  'localhost',
  'footics.com',
  'footics.watool.workers.dev',
] as const;

export const OVERLAY_TRANSITION_DURATION = 3000;

export const HIJACKED_KEYS = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
  'Escape',
  'Enter',
  ' ',
  'Backspace',
  'Delete',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
] as const;

export const CATEGORY_KEYS = ['1', '2', '3', '4', '5', '6'] as const;

export const DEBUG_CONFIG = {
  DRY_RUN: false, // 開発環境でも実際に保存を実行するよう変更
} as const;

export const Z_INDEX = {
  TOAST: 2147483647,
} as const;

export const STORAGE_KEYS = {
  LAST_ACTIVE_MATCH_ID: 'lastActiveMatchId',
} as const;
