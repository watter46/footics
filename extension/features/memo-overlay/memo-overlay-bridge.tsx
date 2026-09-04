import type React from 'react';
import { useEffect } from 'react';
import {
  MemoOverlayView,
  useMemoOverlayEventBridge,
  useMemoOverlayStore,
} from '@/features/memo-overlay';
import { QuickTagBar } from './components/QuickTagBar';
import { useMemoSave } from './hooks/use-memo-save';
import { useOverlayStore } from './stores/use-overlay-store';

/**
 * MemoOverlayBridge (Extension Adapter Layer)
 *
 * 責務: 拡張機能固有のI/Oをコア（Hook + View）に繋ぐ「接着剤」。
 *
 * フェーズ2の変更点:
 * - 保存処理を `sendMessage('SAVE_MEMO_RELAY')` から
 *   `chrome.storage.local` のキューへの書き込みに変更。
 * - Content Script が `storage.onChanged` でキューを監視し、
 *   IndexedDB への実書き込みと REFRESH_APP の通知を担う。
 */
export const MemoOverlayBridge: React.FC = () => {
  const { isVisible, mode, matchId, initialData, initialError, open, close } =
    useOverlayStore();

  const reset = useMemoOverlayStore((s) => s.reset);
  const setError = useMemoOverlayStore((s) => s.setError);
  const setTimeStr = useMemoOverlayStore((s) => s.setTimeStr);
  const setSelectedLabels = useMemoOverlayStore((s) => s.setSelectedLabels);
  const setMemo = useMemoOverlayStore((s) => s.setMemo);
  const setEventId = useMemoOverlayStore((s) => s.setEventId);
  const setPeriod = useMemoOverlayStore((s) => s.setPeriod);
  const forceSetPhase = useMemoOverlayStore((s) => s.forceSetPhase);

  // ── ストアの初期化 ──
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Initialization logic handles multi-phase restoration
  useEffect(() => {
    if (!isVisible) return;

    reset(mode);

    if (initialError) {
      setError(initialError);
    }

    if (initialData) {
      if (mode === 'EVENT') {
        if (initialData.id) {
          setEventId(initialData.id);
        }
        if (initialData.period) {
          setPeriod(initialData.period);
        }
        if (initialData.minute !== undefined) {
          const m = initialData.minute;
          const s = initialData.second ?? 0;
          setTimeStr(`${m}:${s.toString().padStart(2, '0')}`);
          // 時間が入力された状態なのでフェーズを進める
          forceSetPhase(1);
        }
        if (initialData.labels) {
          setSelectedLabels(initialData.labels);
          // ラベルも入力済みならメモフェーズへ
          forceSetPhase(2);
        }
      }
      if (initialData.memo) {
        setMemo(initialData.memo);
      }
    }
  }, [
    isVisible,
    mode,
    initialData,
    initialError,
    reset,
    setError,
    setTimeStr,
    setSelectedLabels,
    setMemo,
    setEventId,
    setPeriod,
    forceSetPhase,
  ]);

  const { handleSave } = useMemoSave();

  // ストア連携
  useMemoOverlayEventBridge(close, handleSave, open, isVisible);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 right-6 flex flex-col gap-2 z-50 pointer-events-auto">
      {mode === 'EVENT' && <QuickTagBar />}
      <MemoOverlayView
        matchId={matchId}
        onClose={close}
        onSave={handleSave}
        readOnly={false}
        className="static top-auto right-auto"
      />
    </div>
  );
};
