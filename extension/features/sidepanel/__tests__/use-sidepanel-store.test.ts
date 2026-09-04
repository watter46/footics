import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSidepanelStore } from '../stores/use-sidepanel-store';

// Mock addToSaveQueue
const mockAddToSaveQueue = vi.fn();
vi.mock('../../storage-sync/save-queue', () => ({
  addToSaveQueue: (...args: unknown[]) => mockAddToSaveQueue(...args),
}));

describe('useSidepanelStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSidepanelStore.setState({
      text: '',
      matchId: undefined,
      isSaving: false,
      errorMessage: undefined,
      toast: {
        message: '',
        visible: false,
      },
    });
  });

  it('updates text correctly', () => {
    useSidepanelStore.getState().setText('New note');
    expect(useSidepanelStore.getState().text).toBe('New note');
  });

  it('updates matchId and clears error message', () => {
    useSidepanelStore.setState({ errorMessage: 'Some error' });
    useSidepanelStore.getState().setMatchId('match_100');
    expect(useSidepanelStore.getState().matchId).toBe('match_100');
    expect(useSidepanelStore.getState().errorMessage).toBeUndefined();
  });

  it('sets error when save is called without matchId', async () => {
    useSidepanelStore.setState({ text: 'Some text', matchId: undefined });
    await useSidepanelStore.getState().save();

    expect(useSidepanelStore.getState().errorMessage).toBe(
      '保存先の試合情報が見つかりません。',
    );
    expect(mockAddToSaveQueue).not.toHaveBeenCalled();
  });

  it('successfully saves MATCH memo to queue, resets text, and shows toast', async () => {
    mockAddToSaveQueue.mockResolvedValue(undefined);

    useSidepanelStore.setState({
      text: 'Great tactical analysis',
      matchId: 'match_200',
    });

    await useSidepanelStore.getState().save();

    expect(mockAddToSaveQueue).toHaveBeenCalledWith({
      mode: 'MATCH',
      matchId: 'match_200',
      memo: 'Great tactical analysis',
    });

    const state = useSidepanelStore.getState();
    expect(state.text).toBe('');
    expect(state.isSaving).toBe(false);
    expect(state.toast.message).toBe('Match Memo Saved');
    expect(state.toast.visible).toBe(true);
  });

  it('handles addToSaveQueue failure gracefully', async () => {
    mockAddToSaveQueue.mockRejectedValue(new Error('Queue write error'));

    useSidepanelStore.setState({
      text: 'Notes',
      matchId: 'match_300',
    });

    await useSidepanelStore.getState().save();

    const state = useSidepanelStore.getState();
    expect(state.errorMessage).toBe('保存キューへの書き込みに失敗しました。');
    expect(state.isSaving).toBe(false);
  });
});
