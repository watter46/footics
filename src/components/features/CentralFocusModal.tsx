"use client";

import React, { useEffect } from "react";
import { EVENT_GROUPS } from "@/lib/event-definitions";
import { useKeyboardShortcut, useModalToggleShortcut } from "@/hooks/use-shortcut";
import { SHORTCUT_ACTIONS, isActionMatch } from "@/lib/shortcuts";
import { useUIStore } from "@/hooks/use-ui-store";
import { saveCustomEvent } from "@/lib/db";
import { loadCustomEventsToDuckDB } from "@/lib/duckdb/data-loader";
import type { AsyncDuckDBConnection, AsyncDuckDB } from "@duckdb/duckdb-wasm";

import { useMemoOverlayDerived, useMemoOverlayStore } from "@/stores/useMemoOverlayStore";
import { MemoOverlayView } from "./MemoOverlay/MemoOverlayView";
import { createSavePayload } from "@/lib/features/MemoOverlay/memoOverlayLogic";

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
 * - 統一された useMemoOverlayStore と MemoOverlayView を使用。
 * - 保存処理として DuckDB への書き込みとタイムライン更新を実行。
 */
export function CentralFocusModal({ 
  matchId, db, connection, onRefresh, editingEvent, onClose 
}: CentralFocusModalProps) {
  const { isCentralFocusOpen, setCentralFocusOpen } = useUIStore();
  const store = useMemoOverlayStore();
  const { phase, error, nextPhase } = store;

  // ── 保存処理（Main App 固有の実装） ──
  const handleSave = async () => {
    const currentState = useMemoOverlayStore.getState();
    
    // バリデーション
    if (currentState.mode === "EVENT") {
      const result = currentState.nextPhase();
      if (result === "BLOCKED") return;
      // 最終フェーズでなければ抜ける（保存はフェーズ2のみ）
      if (currentState.phase < 2) return;
    }

    const payload = createSavePayload({
      mode: currentState.mode,
      timeStr: currentState.timeStr,
      selectedLabels: currentState.selectedLabels,
      memo: currentState.memo,
    });
    
    if (!payload || payload.type !== "EVENT") return;

    store.setIsSaving(true);
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
      store.setError("保存に失敗しました。");
    } finally {
      store.setIsSaving(false);
    }
  };

  // Modal Toggle (Global & Esc)
  useModalToggleShortcut(SHORTCUT_ACTIONS.OPEN_QUICK_EVENT, setCentralFocusOpen, { isOpen: isCentralFocusOpen });

  // Group Selection (Ctrl + 1~6 を Hook 側のアクションへ)
  useKeyboardShortcut(
    (e: KeyboardEvent) => {
      const groupIndex = EVENT_GROUPS.findIndex(g => isActionMatch(e, { key: g.shortcutKey, ctrl: true }));
      if (groupIndex !== -1 && isCentralFocusOpen && phase === 1) {
        store.filterByCategory(groupIndex);
        return true;
      }
      return false;
    },
    () => {}, 
    { enabled: isCentralFocusOpen && phase === 1, ignoreInput: false }
  );

  // 編集イベントの注入
  useEffect(() => {
    if (editingEvent && isCentralFocusOpen) {
      const timeStr = `${String(editingEvent.minute).padStart(2, "0")}${String(editingEvent.second).padStart(2, "0")}`;
      store.reset("EVENT");
      store.setTimeStr(timeStr);
      if (editingEvent.labels) {
        editingEvent.labels.forEach((l: string) => store.addLabel(l));
      }
      store.setMemo(editingEvent.memo || "");
      store.forceSetPhase(2); // 最初からメモフェーズへ
    }
  }, [editingEvent, isCentralFocusOpen]);

  // モーダルが閉じられた際のリセット
  useEffect(() => {
    if (!isCentralFocusOpen) {
      store.reset();
      if (editingEvent && onClose) {
        onClose();
      }
    }
  }, [isCentralFocusOpen, editingEvent, onClose]);

  if (!isCentralFocusOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md" onClick={() => setCentralFocusOpen(false)}>
       <div onClick={e => e.stopPropagation()}>
         <MemoOverlayView 
           matchId={matchId} 
           onClose={() => setCentralFocusOpen(false)}
           onSave={handleSave} 
         />
       </div>
    </div>
  );
}
