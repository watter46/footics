'use client';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionBottomSheet } from '@/features/match-detail/components/ActionBottomSheet';
import { useEditEventStore } from '@/features/match-detail/stores/edit-event-store';
import { useEditEventForm } from './hooks/useEditEventForm';

const TIME_ADJUST_SECONDS = 5;

export function EditEventSheet() {
  const isOpen = useEditEventStore(state => state.isOpen);
  const closeEditSheet = useEditEventStore(state => state.closeEditSheet);

  const {
    event,
    player,
    draftMemo,
    setDraftMemo,
    draftTime,
    setDraftTime,
    actionName,
    subjectLabel,
    handleAdjustTime,
    handleSave,
    handleDelete,
    isActionSheetOpen,
    openActionSheet,
    handleActionSheetOpenChange,
    handleActionSelect,
  } = useEditEventForm();

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeEditSheet} className="gap-6">
        <div className="flex flex-col gap-6">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">イベントを編集</h2>
            <p className="text-sm text-slate-400">{subjectLabel}</p>
            {player?.number != null ? (
              <p className="text-xs text-slate-500">背番号: {player.number}</p>
            ) : null}
          </header>

          {!event ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-400">
              イベントを読み込み中です…
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <section className="space-y-3">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-200">メモ</h3>
                  <textarea
                    value={draftMemo}
                    onChange={event => setDraftMemo(event.target.value)}
                    maxLength={300}
                    placeholder="プレーの詳細をメモ..."
                    className="h-28 w-full rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 focus:outline-none"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">時間</h3>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleAdjustTime(-TIME_ADJUST_SECONDS)}
                  >
                    -{TIME_ADJUST_SECONDS}s
                  </Button>
                  <Input
                    value={draftTime}
                    onChange={event => setDraftTime(event.target.value)}
                    placeholder="00:00"
                    inputMode="numeric"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleAdjustTime(TIME_ADJUST_SECONDS)}
                  >
                    +{TIME_ADJUST_SECONDS}s
                  </Button>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200">アクション</h3>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <div className="text-sm text-slate-200">
                    {actionName ?? 'アクション未設定'}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={openActionSheet}
                    disabled={!event}
                  >
                    アクションを変更
                  </Button>
                </div>
              </section>

              <footer className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!event}
                >
                  削除
                </Button>
                <Button type="button" variant="ghost" onClick={closeEditSheet}>
                  キャンセル
                </Button>
                <Button type="button" onClick={handleSave} disabled={!event}>
                  決定
                </Button>
              </footer>
            </div>
          )}
        </div>
      </BottomSheet>

      <ActionBottomSheet
        isOpen={isActionSheetOpen}
        onOpenChange={handleActionSheetOpenChange}
        onActionSelect={handleActionSelect}
        title="アクションを再選択"
      />
    </>
  );
}
