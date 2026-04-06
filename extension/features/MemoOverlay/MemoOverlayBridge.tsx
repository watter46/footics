import React from "react";
import { browser } from "wxt/browser";
import { useMemoOverlayStore, useMemoOverlayDerived } from "@/stores/useMemoOverlayStore";
import { useMemoOverlayEventBridge } from "@/hooks/features/MemoOverlay/useMemoOverlayEventBridge";
import { MemoOverlayView } from "@/components/features/MemoOverlay/MemoOverlayView";
import { type MemoMode, createSavePayload } from "@/lib/features/MemoOverlay/memoOverlayLogic";
import type { ExtensionMessage, SaveMemoResponse } from "../../types/messaging";

interface MemoOverlayBridgeProps {
  mode: MemoMode;
  matchId: string | undefined;
  initialError?: string;
  onClose: () => void;
  onSaveSuccess: (message: string) => void;
}

/**
 * 検証モード (DRY_RUN)
 * 本番運用時は false に設定します。
 */
const DRY_RUN = false;

/**
 * MemoOverlayBridge (Extension Adapter Layer)
 *
 * 責務: 拡張機能固有のI/Oをコア（Hook + View）に繋ぐ「接着剤」。
 * - Zustand ストア (`useMemoOverlayStore`) でコアロジックを管理
 * - `useMemoOverlayEventBridge` で footics-action イベントを購読
 * - `handleSave` として `browser.runtime.sendMessage` を実行
 */
export const MemoOverlayBridge: React.FC<MemoOverlayBridgeProps> = ({
  mode,
  matchId,
  onClose,
  onSaveSuccess,
}) => {
  const store = useMemoOverlayStore();
  const derived = useMemoOverlayDerived();

  // ── 保存処理（Extension 固有の実装） ──
  const handleSave = async () => {
    const currentState = useMemoOverlayStore.getState();

    if (!DRY_RUN && !matchId) {
      store.setError("保存先の試合情報が見つかりません。");
      return;
    }

    // バリデーション
    if (currentState.mode === "EVENT") {
      const result = store.nextPhase();
      if (result === "BLOCKED") return;
      if (currentState.phase < 2) return;
    }

    const payload = createSavePayload({
      mode: currentState.mode,
      timeStr: currentState.timeStr,
      selectedLabels: currentState.selectedLabels,
      memo: currentState.memo,
    });
    
    if (!payload) return;

    store.setIsSaving(true);
    try {
      if (DRY_RUN) {
        console.info("🚀 [DRY RUN] Save Payload:", { matchId, ...payload });
        await new Promise((resolve) => setTimeout(resolve, 500));
        onSaveSuccess("Dry Run: Saved");
        store.reset();
        return;
      }

      const message: ExtensionMessage = {
        type: "SAVE_MEMO_RELAY",
        mode: currentState.mode,
        matchId: matchId!,
        memo: payload.memo,
      };

      if (payload.type === "EVENT") {
        message.minute = payload.minute;
        message.second = payload.second;
        message.labels = payload.labels;
      }

      const response = await browser.runtime.sendMessage(message) as SaveMemoResponse;

      if (response?.success) {
        onClose();
        onSaveSuccess("Saved Successfully");
      } else {
        store.setError(response?.error || "保存に失敗しました。本体タブを確認してください。");
      }
    } catch (err) {
      console.error("[MemoOverlayBridge] sendMessage failed:", err);
      store.setError("通信エラーが発生しました。");
    } finally {
      store.setIsSaving(false);
    }
  };

  // ストア連携
  useMemoOverlayEventBridge(onClose, handleSave);

  return (
    <MemoOverlayView
      matchId={matchId}
      onClose={onClose}
      onSave={handleSave}
    />
  );
};

