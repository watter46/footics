'use client';

import { useCallback, useState } from 'react';
import { useMemoOverlayStore } from '@/features/memo-overlay';
import { deleteCustomEvent } from '@/lib/db';
import type { EventRow } from '@/types';

export function useCustomEventOperations() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const resetMemoOverlay = useMemoOverlayStore((s) => s.reset);
  const setEventId = useMemoOverlayStore((s) => s.setEventId);
  const setPeriod = useMemoOverlayStore((s) => s.setPeriod);
  const setTimeStr = useMemoOverlayStore((s) => s.setTimeStr);
  const setSelectedLabels = useMemoOverlayStore((s) => s.setSelectedLabels);
  const setMemo = useMemoOverlayStore((s) => s.setMemo);
  const forceSetPhase = useMemoOverlayStore((s) => s.forceSetPhase);
  const setModalOpen = useMemoOverlayStore((s) => s.setModalOpen);

  const handleEditCustomEvent = useCallback(
    (event: EventRow) => {
      const labels = (event.custom_label || '')
        .split(' / ')
        .map((s: string) => s.trim())
        .filter(Boolean);

      resetMemoOverlay('EVENT');
      setEventId(event.id.toString());
      setPeriod(Number(event.period));
      setTimeStr(`${event.minute}:${event.second.toString().padStart(2, '0')}`);
      setSelectedLabels(labels);
      setMemo(event.custom_memo || '');
      forceSetPhase(2);
      setModalOpen(true);
    },
    [
      resetMemoOverlay,
      setEventId,
      setPeriod,
      setTimeStr,
      setSelectedLabels,
      setMemo,
      forceSetPhase,
      setModalOpen,
    ],
  );

  const handleDeleteCustomEvent = useCallback(async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    await deleteCustomEvent(eventId);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleRefreshCustomEvents = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return {
    refreshTrigger,
    setRefreshTrigger,
    handleEditCustomEvent,
    handleDeleteCustomEvent,
    handleRefreshCustomEvents,
  };
}
