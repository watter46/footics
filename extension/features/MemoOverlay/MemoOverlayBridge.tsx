import React from "react";
import { browser } from "wxt/browser";
import { useMemoOverlay } from "@/hooks/features/MemoOverlay/useMemoOverlay";
import { useMemoOverlayEventBridge } from "@/hooks/features/MemoOverlay/useMemoOverlayEventBridge";
import { MemoOverlayView } from "@/components/features/MemoOverlay/MemoOverlayView";
import type { MemoMode } from "@/hooks/features/MemoOverlay/useMemoOverlay";
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
 * - `useMemoOverlay` でコアロジックをインスタンス化
 * - `useMemoOverlayEventBridge` で footics-action イベントを購読
 * - `handleSave` として `browser.runtime.sendMessage` を実行
 */
export const MemoOverlayBridge: React.FC<MemoOverlayBridgeProps> = ({
  mode,
  matchId,
  initialError,
  onClose,
  onSaveSuccess,
}) => {
  const { state, actions } = useMemoOverlay(mode, initialError);

  // ── 保存処理（Extension 固有の実装） ──
  const handleSave = async () => {
    if (!DRY_RUN && !matchId) {
      actions.setError("保存先の試合情報が見つかりません。");
      return;
    }
    if (!actions.validateBeforeSave()) return;

    const payload = actions.getSavePayload();
    if (!payload) return;

    actions.setIsSaving(true);
    try {
      if (DRY_RUN) {
        console.info("🚀 [DRY RUN] Save Payload:", { matchId, ...payload });
        await new Promise((resolve) => setTimeout(resolve, 500));
        onSaveSuccess("Dry Run: Saved");
        actions.reset();
        return;
      }

      const message: ExtensionMessage = {
        type: "SAVE_MEMO_RELAY",
        mode,
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
        actions.setError(response?.error || "保存に失敗しました。本体タブを確認してください。");
      }
    } catch (err) {
      console.error("[MemoOverlayBridge] sendMessage failed:", err);
      actions.setError("通信エラーが発生しました。");
    } finally {
      actions.setIsSaving(false);
    }
  };

  useMemoOverlayEventBridge(state, actions, onClose, handleSave);

  return (
    <MemoOverlayView
      state={state}
      actions={actions}
      matchId={matchId}
      onClose={onClose}
      onSave={handleSave}
    />
  );
};

