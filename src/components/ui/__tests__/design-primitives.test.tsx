import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton } from '../action-button';
import { FloatingSurface } from '../floating-surface';
import { IconButton } from '../icon-button';
import { SegmentedControl } from '../segmented-control';

describe('Design System Primitives', () => {
  describe('FloatingSurface', () => {
    it('renders with default floating variant', () => {
      const { container } = render(
        <FloatingSurface>
          <span>Panel Content</span>
        </FloatingSurface>,
      );
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
      expect(container.firstChild as HTMLElement).toHaveClass(
        'backdrop-blur-md',
      );
    });

    it('renders subtle variant correctly', () => {
      const { container } = render(
        <FloatingSurface variant="subtle">
          <span>Subtle</span>
        </FloatingSurface>,
      );
      expect(container.firstChild as HTMLElement).toHaveClass(
        'bg-white/[0.03]',
      );
    });
  });

  describe('IconButton', () => {
    it('renders button and handles click', () => {
      const handleClick = vi.fn();
      render(
        <IconButton onClick={handleClick} aria-label="Settings">
          <span>⚙</span>
        </IconButton>,
      );
      const button = screen.getByRole('button', { name: 'Settings' });
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders active state correctly', () => {
      render(
        <IconButton isActive aria-label="Active Tool">
          <span>✏</span>
        </IconButton>,
      );
      const button = screen.getByRole('button', { name: 'Active Tool' });
      expect(button).toHaveAttribute('data-active', 'true');
    });
  });

  describe('ActionButton', () => {
    it('renders with label and icon', () => {
      render(
        <ActionButton icon={<span data-testid="test-icon">★</span>}>
          Export
        </ActionButton>,
      );
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('applies primary variant style', () => {
      const { container } = render(
        <ActionButton variant="primary">Submit</ActionButton>,
      );
      expect(container.firstChild as HTMLElement).toHaveClass('bg-blue-600');
    });
  });

  describe('SegmentedControl', () => {
    it('renders options and switches active segment', () => {
      const handleChange = vi.fn();
      const options = [
        { id: 'tab1', label: 'Tab 1' },
        { id: 'tab2', label: 'Tab 2' },
      ];
      render(
        <SegmentedControl
          value="tab1"
          options={options}
          onChange={handleChange}
        />,
      );

      const tab2Button = screen.getByRole('radio', { name: 'Tab 2' });
      fireEvent.click(tab2Button);
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });
  });
});
