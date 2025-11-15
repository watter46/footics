import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  content:
    | string
    | {
        eventId: number;
        subject: string;
        actionName: string;
        time: string;
      };
  duration?: number;
  onClick?: (id: string) => void;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast(toast) {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 3000,
    };

    set(state => ({
      toasts: [...state.toasts, newToast],
    }));

    const duration = newToast.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast(id) {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id),
    }));
  },
}));

export const toast = {
  success: (
    content: Toast['content'],
    duration?: number,
    onClick?: (id: string) => void
  ) => {
    useToastStore
      .getState()
      .addToast({ type: 'success', content, duration, onClick });
  },
  error: (
    content: Toast['content'],
    duration?: number,
    onClick?: (id: string) => void
  ) => {
    useToastStore
      .getState()
      .addToast({ type: 'error', content, duration, onClick });
  },
  info: (
    content: Toast['content'],
    duration?: number,
    onClick?: (id: string) => void
  ) => {
    useToastStore
      .getState()
      .addToast({ type: 'info', content, duration, onClick });
  },
};
