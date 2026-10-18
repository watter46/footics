import type React from 'react';
import { useEffect } from 'react';
import { MemoOverlayView } from '@/features/memo-overlay/components/MemoOverlayView';
import { useMemoOverlayEventBridge } from '@/features/memo-overlay/hooks/useMemoOverlayEventBridge';
import { useMemoOverlayStore } from '@/features/memo-overlay/stores/memo-overlay-store';
import { QuickTagBar } from './components/QuickTagBar';
import { useMatchMemoLoader } from './hooks/use-match-memo-loader';
import { useMemoSave } from './hooks/use-memo-save';
import { useOverlayStore } from './stores/use-overlay-store';

/**
 * MemoOverlayBridge (Extension Adapter Layer - Level 3 Feature View)
 *
 * 責務: 拡張機能固有のI/Oをコア（Hook + View）に繋ぐ「接着剤」。
 * - キャッシュや IndexedDB から初期メモを非同期解決
 * - MemoOverlayView（Level 2 Domain UI）へ Props 確定注入
 * - ショートカット・イベントブリッジ・保存キュー連携
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

  // キャッシュおよびDBから初期メモを非同期解決
  const resolvedMemo = useMatchMemoLoader({
    matchId,
    mode,
    initialMemo: initialData?.memo,
    isVisible,
  });

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
          forceSetPhase(1);
        }
        if (initialData.labels) {
          setSelectedLabels(initialData.labels);
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
        initialMemo={resolvedMemo}
        initialData={initialData}
        onClose={close}
        onSave={handleSave}
        readOnly={false}
        className="static top-auto right-auto"
      />
    </div>
  );
};
