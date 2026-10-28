import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardLoadingView } from '../dashboard-loading-view';

describe('DashboardLoadingView', () => {
  it('renders default initializing message when status is initializing', () => {
    const { container } = render(
      <DashboardLoadingView status="initializing" />,
    );
    expect(screen.getByText('Initializing DuckDB-WASM...')).toBeDefined();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');
  });

  it('renders custom message when provided', () => {
    render(
      <DashboardLoadingView status="loading" message="Custom loading..." />,
    );
    expect(screen.getByText('Custom loading...')).toBeDefined();
  });
});
