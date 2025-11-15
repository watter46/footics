import { create } from 'zustand';

interface EditEventState {
  isOpen: boolean;
  editingEventId: number | null;
  openEditSheet: (eventId: number) => void;
  closeEditSheet: () => void;
}

export const useEditEventStore = create<EditEventState>(set => ({
  isOpen: false,
  editingEventId: null,
  openEditSheet: eventId => set({ isOpen: true, editingEventId: eventId }),
  closeEditSheet: () => set({ isOpen: false, editingEventId: null }),
}));
