import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../patterns/empty-state';
import { ErrorState } from '../patterns/error-state';
import { FilterPills } from '../patterns/filter-pills';
import { InlineLoading, PageLoading } from '../patterns/loading-state';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adjusting your search criteria"
      />,
    );
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(
      screen.getByText('Try adjusting your search criteria'),
    ).toBeInTheDocument();
  });

  it('renders icon as a component or as a ReactNode element', () => {
    const MockIcon = () => <span data-testid="mock-icon-comp" />;
    const { rerender } = render(
      <EmptyState icon={MockIcon} title="Component Icon" />,
    );
    expect(screen.getByTestId('mock-icon-comp')).toBeInTheDocument();

    rerender(
      <EmptyState
        icon={<span data-testid="mock-icon-elem" />}
        title="Element Icon"
      />,
    );
    expect(screen.getByTestId('mock-icon-elem')).toBeInTheDocument();
  });

  it('renders action button and applies custom className', () => {
    render(
      <EmptyState
        title="Action Test"
        action={<button type="button">Create New</button>}
        className="custom-empty-class"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Create New' }),
    ).toBeInTheDocument();
    const container = screen
      .getByText('Action Test')
      .closest('.custom-empty-class');
    expect(container).toBeInTheDocument();
  });
});

describe('LoadingState', () => {
  it('PageLoading renders default and custom message', () => {
    const { rerender } = render(<PageLoading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    rerender(<PageLoading message="Fetching tactics..." />);
    expect(screen.getByText('Fetching tactics...')).toBeInTheDocument();
  });

  it('InlineLoading renders with or without message', () => {
    const { rerender, container } = render(<InlineLoading />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    rerender(<InlineLoading message="Saving..." />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders default title, message, and error code', () => {
    render(<ErrorState message="Failed to load tactic" code="ERR_NOT_FOUND" />);
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByText('Failed to load tactic')).toBeInTheDocument();
    expect(screen.getByText('ERR_NOT_FOUND')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Network Error"
        message="Please check your connection"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders back navigation link when backHref is provided', () => {
    render(
      <ErrorState
        message="Not found"
        backHref="/tactics"
        backLabel="Back to Tactics"
      />,
    );
    const link = screen.getByRole('link', { name: 'Back to Tactics' });
    expect(link).toHaveAttribute('href', '/tactics');
  });

  it('supports fullscreen mode', () => {
    const { container } = render(
      <ErrorState message="Critical failure" fullscreen />,
    );
    expect(container.firstChild as HTMLElement).toHaveClass('fixed', 'inset-0');
  });
});

describe('FilterPills', () => {
  const items = [
    { id: 'all', label: 'All', count: 12 },
    { id: 'tactics', label: 'Tactics', count: 8 },
    { id: 'drills', label: 'Drills', count: 4 },
  ];

  it('renders all filter items with labels and counts', () => {
    render(<FilterPills items={items} value="all" onChange={() => {}} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Tactics')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Drills')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('calls onChange with the selected item id when clicked', () => {
    const onChange = vi.fn();
    render(<FilterPills items={items} value="all" onChange={onChange} />);

    fireEvent.click(screen.getByText('Tactics'));
    expect(onChange).toHaveBeenCalledWith('tactics');
  });
});
