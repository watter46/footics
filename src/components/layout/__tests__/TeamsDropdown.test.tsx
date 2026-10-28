import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeamsDropdown } from '../TeamsDropdown';

describe('TeamsDropdown', () => {
  it('renders dropdown and displays teams list when opened without slate/zinc classes', () => {
    const { container } = render(<TeamsDropdown />);
    const trigger = screen.getByRole('button', { name: /teams/i });
    expect(trigger).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');

    fireEvent.click(trigger);

    expect(screen.getByText('Club Teams')).toBeInTheDocument();
    expect(screen.getByText('Chelsea FC')).toBeInTheDocument();
  });
});
