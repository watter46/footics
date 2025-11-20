import { create } from 'zustand';

interface EditEventState {
  isOpen: boolean;
  editingEventId: number | null;
  openEditSheet: (eventId: number) => void;
  closeEditSheet: () => void;
}

/**
 * Edit Event Store (Zustand)
 *
 * 責務:
 * - イベント編集シートの開閉状態と、編集対象のイベントIDを管理する
 * - グローバルなUI状態として扱う
 */
export const useEditEventStore = create<EditEventState>(set => ({
  isOpen: false,
  editingEventId: null,
  openEditSheet: eventId => set({ isOpen: true, editingEventId: eventId }),
  closeEditSheet: () => set({ isOpen: false, editingEventId: null }),
}));
