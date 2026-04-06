"use client";

import React, { useEffect } from "react";
import { EVENT_GROUPS } from "@/lib/event-definitions";
import { useKeyboardShortcut, useModalToggleShortcut } from "@/hooks/use-shortcut";
import { SHORTCUT_ACTIONS, isActionMatch } from "@/lib/shortcuts";
import { useUIStore } from "@/hooks/use-ui-store";
import { saveCustomEvent } from "@/lib/db";
import { loadCustomEventsToDuckDB } from "@/lib/duckdb/data-loader";
import type { AsyncDuckDBConnection, AsyncDuckDB } from "@duckdb/duckdb-wasm";

import { useMemoOverlay } from "@/hooks/features/MemoOverlay/useMemoOverlay";
import { MemoOverlayView } from "./MemoOverlay/MemoOverlayView";

interface CentralFocusModalProps {
  matchId: string;
  db: AsyncDuckDB | null;
  connection: AsyncDuckDBConnection | null;
  onRefresh: (eventId: string) => void;
  editingEvent?: any;
  onClose?: () => void;
}

/**
 * CentralFocusModal (Main App Adapter)
 * 責務: クイックイベント入力の「本体アプリ用」アダプター。
 * - 統一された useMemoOverlay と MemoOverlayView を使用。
 * - 保存処理として DuckDB への書き込みとタイムライン更新を実行。
 */
export function CentralFocusModal({ 
  matchId, db, connection, onRefresh, editingEvent, onClose 
}: CentralFocusModalProps) {
  const { isCentralFocusOpen, setCentralFocusOpen } = useUIStore();
  const { state, actions } = useMemoOverlay("EVENT");

  // ── 保存処理（Main App 固有の実装） ──
  const handleSave = async () => {
    if (!actions.validateBeforeSave()) return;
    const payload = actions.getSavePayload();
    if (!payload || payload.type !== "EVENT") return;

    actions.setIsSaving(true);
    try {
      const id = editingEvent ? editingEvent.id : crypto.randomUUID();
      const event = {
        id,
        match_id: matchId,
        minute: payload.minute,
        second: payload.second,
        labels: payload.labels,
        memo: payload.memo.trim(),
        created_at: Date.now(),
      };

      await saveCustomEvent(event as any);

      if (db && connection) {
        await loadCustomEventsToDuckDB(db, connection, matchId);
      }

      setCentralFocusOpen(false);
      onRefresh(id);

      // 外部への通知（拡張機能などが必要に応じて受信）
      window.dispatchEvent(new CustomEvent('footics-action', { 
          detail: { type: 'event-save', matchId, eventId: id } 
      }));
    } catch (err) {
      console.error("[CentralFocusModal] Save failed:", err);
      actions.setError("保存に失敗しました。");
    } finally {
      actions.setIsSaving(false);
    }
  };

  // Modal Toggle (Global & Esc)
  useModalToggleShortcut(SHORTCUT_ACTIONS.OPEN_QUICK_EVENT, setCentralFocusOpen, { isOpen: isCentralFocusOpen });

  // Group Selection (Ctrl + 1~6 を Hook 側のアクションへ)
  useKeyboardShortcut(
    (e: KeyboardEvent) => {
      const groupIndex = EVENT_GROUPS.findIndex(g => isActionMatch(e, { key: g.shortcutKey, ctrl: true }));
      if (groupIndex !== -1 && isCentralFocusOpen && state.phase === 1) {
        actions.filterByCategory(groupIndex);
        return true;
      }
      return false;
    },
    () => {}, 
    { enabled: isCentralFocusOpen && state.phase === 1, ignoreInput: false }
  );

  // 編集イベントの注入
  useEffect(() => {
    if (editingEvent) {
      setCentralFocusOpen(true);
      const timeStr = `${String(editingEvent.minute).padStart(2, "0")}${String(editingEvent.second).padStart(2, "0")}`;
      actions.setTimeStr(timeStr);
      // ラベルを一つずつ追加
      if (editingEvent.labels) {
        editingEvent.labels.forEach((l: string) => actions.addLabel(l));
      }
      actions.setMemo(editingEvent.memo || "");
      actions.forceSetPhase(2); // 最初からメモフェーズへ
    }
  }, [editingEvent, actions, setCentralFocusOpen]);

  // モーダルが閉じられた際のリセット
  useEffect(() => {
    if (!isCentralFocusOpen) {
      actions.reset();
      // onClose は、編集中のイベントがあった場合のみ呼び出す（無限ループ防止）
      if (editingEvent && onClose) {
        onClose();
      }
    }
  }, [isCentralFocusOpen, actions.reset, onClose, editingEvent]);

  if (!isCentralFocusOpen) return null;

  // 既存のモーダルUIの枠組みに MemoOverlayView を埋め込む
  // ※ MemoOverlayView は fixed ポジションのため、そのまま表示可能
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md">
       <MemoOverlayView 
         state={state} 
         actions={actions} 
         matchId={matchId} 
         onClose={() => setCentralFocusOpen(false)}
         onSave={handleSave} 
       />
    </div>
  );
}
