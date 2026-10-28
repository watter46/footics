import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarTitle } from '../top-bar-title';

describe('TopBarTitle', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders project manager button and triggers openProjectManagerModal', () => {
    const openModalSpy = vi.fn();
    useTacticalUnifiedStore.setState({ openProjectManagerModal: openModalSpy });

    render(<TopBarTitle />);

    const projectsButton = screen.getByRole('button', {
      name: /Projects/i,
    });
    expect(projectsButton).toBeDefined();

    fireEvent.click(projectsButton);
    expect(openModalSpy).toHaveBeenCalledTimes(1);
  });

  it('does not contain deprecated blue-500 classes in container or buttons', () => {
    const { container } = render(<TopBarTitle />);
    const html = container.innerHTML;
    expect(html).not.toContain('blue-500');
    expect(html).not.toContain('blue-600');
    expect(html).not.toContain('blue-300');
    expect(html).not.toContain('blue-200');
    expect(html).not.toContain('blue-400');
  });

  it('allows renaming the project title', () => {
    useTacticalUnifiedStore.setState({
      project: {
        ...useTacticalUnifiedStore.getState().project,
        title: 'Initial Tactics',
      },
    });

    render(<TopBarTitle />);

    const titleButton = screen.getByRole('button', {
      name: /Initial Tactics/i,
    });
    fireEvent.click(titleButton);

    const input = screen.getByRole('textbox');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('Initial Tactics');

    fireEvent.change(input, { target: { value: 'Updated Tactics' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useTacticalUnifiedStore.getState().project.title).toBe(
      'Updated Tactics',
    );
  });
});
