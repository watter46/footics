import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton } from '../action-button';
import { Button } from '../button';
import { Card, KpiTile } from '../card';
import { Dialog, DialogFooter, DialogHeader } from '../dialog';
import { FloatingSurface } from '../floating-surface';
import { IconButton } from '../icon-button';
import { Input, SearchInput } from '../input';
import { PositionBadge } from '../position-badge';
import { SegmentedControl } from '../segmented-control';
import { NativeSelect } from '../select';
import { Switch } from '../switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';

describe('Design System Primitives', () => {
  describe('Button & ActionButton', () => {
    it('renders primary variant with neon orange style', () => {
      const { container } = render(<Button variant="primary">Primary</Button>);
      const btn = container.firstChild as HTMLElement;
      expect(btn).toHaveClass('btn-guideline-primary');
      expect(btn).toHaveTextContent('Primary');
    });

    it('renders play variant with neon blue style', () => {
      const { container } = render(<Button variant="play">Play Video</Button>);
      const btn = container.firstChild as HTMLElement;
      expect(btn).toHaveClass('btn-guideline-play');
    });

    it('renders with icon and iconPosition', () => {
      render(
        <Button
          icon={<span data-testid="right-icon">→</span>}
          iconPosition="right"
        >
          Next
        </Button>,
      );
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('supports ActionButton alias identical to Button', () => {
      render(
        <ActionButton
          variant="danger"
          icon={<span data-testid="del-icon">✕</span>}
        >
          Delete
        </ActionButton>,
      );
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByTestId('del-icon')).toBeInTheDocument();
    });

    it('renders active state with enhanced orange neon glow', () => {
      render(
        <Button isActive aria-label="Active Action">
          Active Action
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Active Action' });
      expect(button).toHaveAttribute('data-active', 'true');
      expect(button).toHaveClass('bg-[#FF8100]/24');
      expect(button).toHaveClass('text-[#FFA336]');
      expect(button).toHaveClass('border-[#FF8100]/80');
      expect(button).toHaveClass('ring-[#FF8100]/40');
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

    it('renders active state with enhanced orange neon glow', () => {
      render(
        <IconButton isActive aria-label="Active Tool">
          <span>✏</span>
        </IconButton>,
      );
      const button = screen.getByRole('button', { name: 'Active Tool' });
      expect(button).toHaveAttribute('data-active', 'true');
      expect(button).toHaveClass('bg-[#FF8100]/24');
      expect(button).toHaveClass('text-[#FFA336]');
      expect(button).toHaveClass('border-[#FF8100]/80');
      expect(button).toHaveClass('ring-[#FF8100]/40');
    });
  });

  describe('PositionBadge', () => {
    it('renders FW badge with neon style', () => {
      const { container } = render(
        <PositionBadge position="FW" label="FW / ST" />,
      );
      expect(screen.getByText('FW / ST')).toBeInTheDocument();
      expect(container.firstChild as HTMLElement).toHaveClass('badge-pos-fw');
    });

    it('renders button variant and handles onSelect', () => {
      const handleSelect = vi.fn();
      render(
        <PositionBadge
          position="MID"
          variant="button"
          isActive={false}
          onSelect={handleSelect}
        />,
      );
      const badge = screen.getByRole('button');
      fireEvent.click(badge);
      expect(handleSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('FloatingSurface', () => {
    it('renders with default floating variant', () => {
      const { container } = render(
        <FloatingSurface>
          <span>Panel Content</span>
        </FloatingSurface>,
      );
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
      expect(container.firstChild as HTMLElement).toHaveClass('bg-[#18181B]');
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

  describe('Input & SearchInput', () => {
    it('renders text input with L2 surface style', () => {
      render(<Input placeholder="Enter title..." />);
      const input = screen.getByPlaceholderText('Enter title...');
      expect(input).toHaveClass('bg-[#18181B]');
      expect(input).toHaveClass('rounded-[8px]');
    });

    it('renders search input with search icon', () => {
      render(<SearchInput placeholder="Search tags..." />);
      const input = screen.getByPlaceholderText('Search tags...');
      expect(input).toHaveClass('pl-9');
      expect(input).toHaveClass('bg-[#18181B]');
    });
  });

  describe('NativeSelect', () => {
    it('renders custom select dropdown with options', () => {
      render(
        <NativeSelect aria-label="Formation">
          <option value="4-3-3">4-3-3</option>
          <option value="3-2-4-1">3-2-4-1</option>
        </NativeSelect>,
      );
      const select = screen.getByRole('combobox', { name: 'Formation' });
      expect(select).toHaveClass('bg-[#18181B]');
      expect(screen.getByText('4-3-3')).toBeInTheDocument();
    });
  });

  describe('Switch', () => {
    it('renders toggle switch and handles checked change', () => {
      const handleCheckedChange = vi.fn();
      render(
        <Switch
          checked={false}
          onCheckedChange={handleCheckedChange}
          aria-label="Pitch Grid"
        />,
      );
      const toggle = screen.getByRole('switch', { name: 'Pitch Grid' });
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      fireEvent.click(toggle);
      expect(handleCheckedChange).toHaveBeenCalledWith(true);
    });

    it('renders ON state with neon orange glow', () => {
      render(<Switch checked={true} aria-label="Active Switch" />);
      const toggle = screen.getByRole('switch', { name: 'Active Switch' });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(toggle).toHaveClass('bg-[#FF8100]');
    });
  });

  describe('Card & KpiTile', () => {
    it('renders card with L2 surface and hover highlight', () => {
      const { container } = render(<Card>Card Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-[#18181B]');
      expect(card).toHaveClass('rounded-[10px]');
    });

    it('renders KpiTile with title and value', () => {
      render(
        <KpiTile
          title="Expected Goals"
          value="2.41"
          subtext="+0.82 vs opp"
          accentColor="#00A8FF"
        />,
      );
      expect(screen.getByText('Expected Goals')).toBeInTheDocument();
      expect(screen.getByText('2.41')).toBeInTheDocument();
      expect(screen.getByText('+0.82 vs opp')).toBeInTheDocument();
    });
  });

  describe('Dialog', () => {
    it('renders dialog when open with L3 surface and dim backdrop', () => {
      const handleClose = vi.fn();
      render(
        <Dialog open onClose={handleClose}>
          <DialogHeader title="Export Modal" />
          <div>Dialog Body</div>
          <DialogFooter>
            <button type="button">Close</button>
          </DialogFooter>
        </Dialog>,
      );
      expect(screen.getByText('Export Modal')).toBeInTheDocument();
      expect(screen.getByText('Dialog Body')).toBeInTheDocument();
    });
  });

  describe('Table', () => {
    it('renders borderless data grid with row hover', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Position</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Saka</TableCell>
              <TableCell>FW</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByText('Saka')).toBeInTheDocument();
      expect(screen.getByText('FW')).toBeInTheDocument();
    });
  });
});
