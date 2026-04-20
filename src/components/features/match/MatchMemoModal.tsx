'use client';

import React, { useEffect } from 'react';
import { useMatchMemo } from '@/hooks/use-match-memo';
import { useKeyboardShortcut } from '@/hooks/use-shortcut';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import { useMemoOverlayStore } from '@/stores/useMemoOverlayStore';
import { MatchMemoUnit } from '../MemoOverlay/parts/MatchMemoUnit';

interface MatchMemoModalProps {
  matchId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MatchMemoModal - 試合全体の自由記述メモ編集モーダル
 * 統一された MemoOverlay のロジックとUIコンポーネントを使用します。
 */
export function MatchMemoModal({
  matchId,
  isOpen,
  onClose,
}: MatchMemoModalProps) {
  const {
    memo: initialMemo,
    saveMemo,
    isSaving: isMatchSaving,
    isLoading,
  } = useMatchMemo(matchId);
  const store = useMemoOverlayStore();
  const { memo, setMemo } = store;

  // モーダルが開いた際に初期値をセット
  useEffect(() => {
    if (isOpen) {
      store.reset('MATCH');
      store.setMemo(initialMemo || '');
    }
  }, [isOpen, initialMemo]);

  const handleSave = async () => {
    if (!memo.trim()) return;
    await saveMemo(memo);
    onClose();
  };

  useKeyboardShortcut(SHORTCUT_ACTIONS.SAVE_MEMO, handleSave, {
    enabled: isOpen,
    ignoreInput: false,
  });
  useKeyboardShortcut(SHORTCUT_ACTIONS.CLOSE_MODAL, onClose, {
    enabled: isOpen,
    ignoreInput: false,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden flex flex-col mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg tracking-tight text-blue-400">
              Match Memo
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <MatchMemoUnit
            memo={memo}
            isSaving={isMatchSaving}
            hasMatchId={!!matchId}
            onMemoChange={setMemo}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}
