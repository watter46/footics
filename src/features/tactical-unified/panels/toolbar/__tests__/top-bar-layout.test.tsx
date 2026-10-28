import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBar } from '../top-bar';

describe('TopBar 3-column layout robustness', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('applies responsive min-w-0 and shrink constraints to header columns', () => {
    const { container } = render(<TopBar />);

    const header = container.querySelector('header');
    expect(header).toBeDefined();

    // 3 direct children in header
    const columns = header?.children;
    expect(columns?.length).toBeGreaterThanOrEqual(3);

    const leftCol = columns?.[0] as HTMLElement;
    const centerCol = columns?.[1] as HTMLElement;
    const rightCol = columns?.[2] as HTMLElement;

    // Left column
    expect(leftCol.className).toContain('shrink-0');
    expect(leftCol.className).toContain('min-w-0');

    // Center column
    expect(centerCol.className).toContain('min-w-0');
    expect(centerCol.className).toContain('shrink');
    expect(centerCol.className).toContain('overflow-hidden');

    // Right column
    expect(rightCol.className).toContain('shrink-0');
  });

  it('does not render Focus mode button even when onToggleFocusMode is passed', () => {
    const { queryByText, queryByTitle } = render(
      <TopBar onToggleFocusMode={() => {}} />,
    );

    expect(queryByText('Focus')).toBeNull();
    expect(queryByTitle(/Focus Mode/i)).toBeNull();
  });
});
