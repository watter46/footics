import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DataManagementMenu } from '../DataManagementMenu';
import { GlobalDataManagement } from '../GlobalDataManagement';
import { ImportMatchButton } from '../ImportMatchButton';

const mockOpenMatchDialog = vi.fn();
const mockHandleImportMatches = vi.fn();
const mockOpenMemoFileDialog = vi.fn();
const mockHandleExportMemos = vi.fn();
const mockHandleImportMemos = vi.fn();

vi.mock('../../hooks/use-match-data-import', () => ({
  useMatchDataImport: () => ({
    fileInputRef: { current: null },
    isLoading: false,
    progress: null,
    openFileDialog: mockOpenMatchDialog,
    handleFileChange: mockHandleImportMatches,
  }),
}));

vi.mock('../../hooks/use-memo-data-io', () => ({
  useMemoDataIO: () => ({
    memoFileInputRef: { current: null },
    openMemoFileDialog: mockOpenMemoFileDialog,
    handleExportMemos: mockHandleExportMemos,
    handleImportMemos: mockHandleImportMemos,
  }),
}));

const mockOpenBackupFileDialog = vi.fn();
const mockHandleExportBackup = vi.fn();
const mockHandleImportBackup = vi.fn();

vi.mock('../../hooks/use-global-data-backup', () => ({
  useGlobalDataBackup: () => ({
    backupFileInputRef: { current: null },
    isProcessing: false,
    openBackupFileDialog: mockOpenBackupFileDialog,
    handleExportBackup: mockHandleExportBackup,
    handleImportBackup: mockHandleImportBackup,
  }),
}));

describe('DataManagementMenu', () => {
  it('renders trigger button and opens DropdownMenu', () => {
    const { container } = render(
      <DataManagementMenu matchId="test-match" onRefresh={vi.fn()} />,
    );
    const trigger = screen.getByRole('button', { name: /data/i });
    expect(trigger).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');

    fireEvent.click(trigger);

    expect(screen.getByText('Match Data')).toBeInTheDocument();
    expect(screen.getByText('Import Matches')).toBeInTheDocument();
    expect(screen.getByText('Match Memos')).toBeInTheDocument();
    expect(screen.getByText('Import Memos')).toBeInTheDocument();
    expect(screen.getByText('Export Memos')).toBeInTheDocument();
  });
});

describe('GlobalDataManagement', () => {
  it('renders trigger button and opens DropdownMenu', () => {
    const { container } = render(<GlobalDataManagement />);
    const trigger = screen.getByRole('button', { name: /global data/i });
    expect(trigger).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');

    fireEvent.click(trigger);

    expect(screen.getByText('Data Management')).toBeInTheDocument();
    expect(screen.getByText('Full Backup (.zip)')).toBeInTheDocument();
    expect(screen.getByText('Restore Data')).toBeInTheDocument();
  });
});

describe('ImportMatchButton', () => {
  it('renders secondary button and handles click', () => {
    const { container } = render(<ImportMatchButton />);
    const button = screen.getByRole('button', { name: /import/i });
    expect(button).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');

    fireEvent.click(button);
    expect(mockOpenMatchDialog).toHaveBeenCalledTimes(1);
  });
});
