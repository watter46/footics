import type { MemoOverlayState } from '../stores/memo-overlay-types';

export interface FooticsActionDetail {
  action: string;
  categoryIndex?: number;
  key?: string;
  shiftKey?: boolean;
  matchId?: string;
  id?: string;
  period?: number;
  minute?: number;
  second?: number;
  labels?: string[];
  memo?: string;
}

export interface EventBridgeContext {
  onClose: () => void;
  onSave: () => void;
  onOpen?: (params: {
    mode: 'MATCH' | 'EVENT';
    matchId?: string;
    data?: unknown;
  }) => void;
  store: MemoOverlayState;
}

export type ActionHandler = (
  detail: FooticsActionDetail,
  ctx: EventBridgeContext,
) => void;

export const EVENT_BRIDGE_HANDLERS: Record<string, ActionHandler> = {
  TOGGLE_MATCH_MEMO: (detail, { onOpen }) => {
    onOpen?.({
      mode: 'MATCH',
      matchId: detail.matchId,
      data: { memo: detail.memo },
    });
  },
  TOGGLE_EVENT_MEMO: (detail, { onOpen }) => {
    onOpen?.({
      mode: 'EVENT',
      matchId: detail.matchId,
      data: {
        id: detail.id,
        period: detail.period,
        minute: detail.minute,
        second: detail.second,
        labels: detail.labels,
        memo: detail.memo,
      },
    });
  },
  CLOSE_OVERLAY: (_detail, { onClose }) => onClose(),
  SAVE_MEMO: (_detail, { onSave }) => onSave(),
  NEXT_PHASE: (_detail, { store, onSave }) => {
    if (store.mode === 'EVENT') {
      const result = store.nextPhase();
      if (result === 'BLOCKED') return;
    } else {
      onSave();
    }
  },
  PREV_PHASE: (_detail, { store }) => store.prevPhase(),
  BACKSPACE: (_detail, { store }) => {
    if (store.mode === 'EVENT') {
      if (store.phase === 0) store.backspaceTimeStr();
      else if (store.phase === 1) store.backspaceLabel();
    }
  },
  NAVIGATE_SUGGESTION: (detail, { store }) => {
    if (store.mode === 'EVENT' && store.phase === 1) {
      const direction = detail.key === 'ArrowDown' ? 1 : -1;
      store.navigateSuggestion(direction);
    }
  },
  FILTER_CATEGORY: (detail, { store }) => {
    if (store.mode === 'EVENT' && typeof detail.categoryIndex === 'number') {
      store.filterByCategory(detail.categoryIndex);
    }
  },
};
