"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMatchMemo } from "@/hooks/use-match-memo";
import { X, Save, Edit3, Loader2 } from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/use-shortcut";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts";

interface MatchMemoModalProps {
  matchId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MatchMemoModal - 試合全体の自由記述メモ編集モーダル
 * 
 * デザイン:
 * - 集中しやすいダークなオーバーレイ
 * - 大型のテキストエリア
 * - Ctrl+Enter で保存
 */
export function MatchMemoModal({ matchId, isOpen, onClose }: MatchMemoModalProps) {
  const { memo: initialMemo, saveMemo, isSaving, isLoading } = useMatchMemo(matchId);
  const [localMemo, setLocalMemo] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初回表示時に既存のメモをセット
  useEffect(() => {
    if (isOpen) {
      setLocalMemo(initialMemo);
      // 数ミリ秒遅らせてフォーカス（モーダル表示アニメーション対策）
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, initialMemo]);

  const handleSave = () => {
    saveMemo(localMemo);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only local keys like Tab or specific phase transitions stay here if needed.
    // Escape is now handled by useKeyboardShortcut.
  };

  useKeyboardShortcut(SHORTCUT_ACTIONS.SAVE_MEMO, handleSave, { enabled: isOpen, ignoreInput: false });
  useKeyboardShortcut(SHORTCUT_ACTIONS.CLOSE_MODAL, onClose, { enabled: isOpen, ignoreInput: false });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden flex flex-col mx-4 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-100">
            <Edit3 className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-lg tracking-tight">Match Memo</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 relative">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={localMemo}
                onChange={e => setLocalMemo(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="試合全体の戦術メモ、改善点、総括を自由に記述してください..."
                className="w-full h-80 bg-transparent text-slate-100 outline-none resize-none text-lg leading-relaxed placeholder:text-slate-600 font-sans"
                spellCheck={false}
              />
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/50 pt-4">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">Esc</kbd> 
                    閉じる
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">Ctrl + Enter</kbd> 
                    保存
                  </span>
                </div>
                {isSaving && (
                  <span className="text-blue-400 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/50 flex justify-end gap-3 border-t border-slate-800">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            キャンセル
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存して閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
