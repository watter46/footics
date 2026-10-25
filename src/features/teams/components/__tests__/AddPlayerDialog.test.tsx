import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { savePlayerMaster, savePlayerPhoto } from '@/lib/db/queries';
import { AddPlayerDialog } from '../AddPlayerDialog';

vi.mock('@/lib/db/queries', () => ({
  savePlayerMaster: vi.fn().mockResolvedValue(undefined),
  savePlayerPhoto: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AddPlayerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    } else {
      vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue(
        'blob:mock-url',
      );
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  it('calls savePlayerMaster and savePlayerPhoto with (id, photo) when photo is provided', async () => {
    const handleClose = vi.fn();
    const handlePlayerAdded = vi.fn();

    render(
      <AddPlayerDialog
        isOpen={true}
        onClose={handleClose}
        onPlayerAdded={handlePlayerAdded}
      />,
    );

    const inputs = document.body.querySelectorAll('input');
    const textInput = Array.from(inputs).find(
      (input) => input.type === 'text' || !input.type,
    );
    expect(textInput).toBeDefined();
    fireEvent.change(textInput!, { target: { value: 'Cole Palmer' } });

    const fileInput = document.body.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const file = new File(['dummy-image'], 'palmer.png', {
      type: 'image/png',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const submitButton = screen.getByRole('button', { name: /選手を追加/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(savePlayerMaster).toHaveBeenCalledTimes(1);
    });

    expect(savePlayerPhoto).toHaveBeenCalledTimes(1);
    expect(savePlayerPhoto).toHaveBeenCalledWith(expect.any(Number), file);
    expect(vi.mocked(savePlayerPhoto).mock.calls[0]).toHaveLength(2);
    expect(handlePlayerAdded).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call savePlayerPhoto when no photo is provided', async () => {
    const handleClose = vi.fn();
    const handlePlayerAdded = vi.fn();

    render(
      <AddPlayerDialog
        isOpen={true}
        onClose={handleClose}
        onPlayerAdded={handlePlayerAdded}
      />,
    );

    const inputs = document.body.querySelectorAll('input');
    const textInput = Array.from(inputs).find(
      (input) => input.type === 'text' || !input.type,
    );
    expect(textInput).toBeDefined();
    fireEvent.change(textInput!, { target: { value: 'Enzo Fernandez' } });

    const submitButton = screen.getByRole('button', { name: /選手を追加/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(savePlayerMaster).toHaveBeenCalledTimes(1);
    });

    expect(savePlayerPhoto).not.toHaveBeenCalled();
    expect(handlePlayerAdded).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
