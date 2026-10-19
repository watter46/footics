import type React from 'react';
import {
  type EventPhase,
  type MemoOverlayInitialState,
  MemoOverlayStoreProvider,
} from '@/features/memo-overlay';
import { MemoOverlayView } from '@/features/memo-overlay/components/MemoOverlayView';
import { useMemoOverlayEventBridge } from '@/features/memo-overlay/hooks/useMemoOverlayEventBridge';
import { QuickTagBar } from './components/QuickTagBar';
import { useMatchMemoLoader } from './hooks/use-match-memo-loader';
import { useMemoSave } from './hooks/use-memo-save';
import { useOverlayStore } from './stores/use-overlay-store';

/**
 * MemoOverlayBridge (Extension Adapter Layer - Level 3 Feature View)
 *
 * 責務: 拡張機能固有のI/Oをコア（Hook + View）に繋ぐ「接着剤」。
 * - キャッシュや IndexedDB から初期メモを非同期解決
 * - MemoOverlayStoreProvider により初期 Props を確定注入（Flicker ゼロ）
 * - MemoOverlayView（Level 2 Domain UI）へ Props 確定注入
 * - ショートカット・イベントブリッジ・保存キュー連携
 */
export const MemoOverlayBridge: React.FC = () => {
  const { isVisible, mode, matchId, initialData, initialError, open, close } =
    useOverlayStore();

  // キャッシュおよびDBから初期メモを非同期解決
  const resolvedMemo = useMatchMemoLoader({
    matchId,
    mode,
    initialMemo: initialData?.memo,
    isVisible,
  });

  const { handleSave } = useMemoSave();

  // ストア連携
  useMemoOverlayEventBridge(close, handleSave, open, isVisible);

  if (!isVisible) return null;

  const initialTimeStr =
    initialData?.minute !== undefined
      ? `${initialData.minute}:${(initialData.second ?? 0).toString().padStart(2, '0')}`
      : '';

  const initialPhase: EventPhase =
    mode === 'EVENT' && initialData?.labels && initialData.labels.length > 0
      ? 2
      : mode === 'EVENT' && initialData?.minute !== undefined
        ? 1
        : 0;

  const memoInitialState: MemoOverlayInitialState = {
    mode,
    isModalOpen: true,
    memo: resolvedMemo ?? initialData?.memo ?? '',
    eventId: initialData?.id,
    period: initialData?.period ?? 1,
    timeStr: initialTimeStr,
    selectedLabels: initialData?.labels ?? [],
    phase: initialPhase,
    error: initialError,
  };

  return (
    <MemoOverlayStoreProvider
      key={`${matchId}-${mode}-${initialData?.id ?? 'new'}`}
      initialState={memoInitialState}
    >
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
    </MemoOverlayStoreProvider>
  );
};
