import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  CameraSliderField,
  type CameraSliderFieldProps,
} from '../camera-slider-field';

describe('CameraSliderField', () => {
  const defaultProps: CameraSliderFieldProps = {
    id: 'camera-zoom',
    label: 'Zoom (ズーム)',
    ariaLabel: 'Zoom',
    value: 1.0,
    min: 1.0,
    max: 3.0,
    step: 0.1,
    unit: 'x',
    minLabel: '1.0x (標準)',
    maxLabel: '3.0x (拡大)',
    onChange: vi.fn(),
    onChangeEnd: vi.fn(),
  };

  it('1. トラック要素が bg-white/15 クラスを持ち、プログレスバーとノブが表示されること', () => {
    render(<CameraSliderField {...defaultProps} />);

    const track = screen.getByTestId('camera-zoom-track');
    expect(track).toBeDefined();
    expect(track.className).toContain('bg-white/15');

    const progress = screen.getByTestId('camera-zoom-progress');
    expect(progress).toBeDefined();

    const thumb = screen.getByTestId('camera-zoom-thumb');
    expect(thumb).toBeDefined();
  });

  it('2. 数値エリアで水平ドラッグ（startX=100, currentX=150）した際、onChange(1.5) が呼ばれ、pointerup で onChangeEnd(1.5) が1回呼ばれること', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    render(
      <CameraSliderField
        {...defaultProps}
        value={1.0}
        min={1.0}
        max={3.0}
        step={0.1}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      />,
    );

    const scrubber = screen.getByTestId('camera-zoom-scrubber');

    // Pointer down at x = 100
    fireEvent.pointerDown(scrubber, {
      clientX: 100,
      button: 0,
      pointerId: 1,
    });

    // Pointer move to x = 150 (dx = 50 -> 5 steps * 0.1 = +0.5 -> 1.5)
    fireEvent.pointerMove(window, {
      clientX: 150,
      pointerId: 1,
    });

    expect(onChange).toHaveBeenCalledWith(1.5);

    // Pointer up at x = 150
    fireEvent.pointerUp(window, {
      clientX: 150,
      pointerId: 1,
    });

    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledWith(1.5);
  });

  it('3. ドラッグ終了（pointerup）またはアンマウント時に window イベントリスナーが確実に解除されること（RAII）', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<CameraSliderField {...defaultProps} />);
    const scrubber = screen.getByTestId('camera-zoom-scrubber');

    // Start drag
    fireEvent.pointerDown(scrubber, {
      clientX: 100,
      button: 0,
      pointerId: 1,
    });

    // End drag
    fireEvent.pointerUp(window, {
      clientX: 120,
      pointerId: 1,
    });

    // Check removeEventListener was called for pointermove and pointerup
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

    removeSpy.mockClear();

    // Start drag again and unmount while dragging
    fireEvent.pointerDown(scrubber, {
      clientX: 100,
      button: 0,
      pointerId: 1,
    });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('4. 数値エリアをクリックまたはダブルクリックした際、直接入力フィールド（input[type="number"]）に切り替わり Enter で確定できること', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    render(
      <CameraSliderField
        {...defaultProps}
        value={1.0}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      />,
    );

    const scrubber = screen.getByTestId('camera-zoom-scrubber');

    // Click without move switches to input mode
    fireEvent.click(scrubber);

    const input = screen.getByLabelText('Zoom', {
      selector: 'input[type="number"]',
    });
    expect(input).toBeDefined();

    // Enter 2.2 and press Enter
    fireEvent.change(input, { target: { value: '2.2' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(2.2);
    expect(onChangeEnd).toHaveBeenCalledWith(2.2);
  });

  it('5. レンジスライダー（input[type="range"]）の操作で onChange が呼ばれ、pointerUp で onChangeEnd が呼ばれること', () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();

    render(
      <CameraSliderField
        {...defaultProps}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      />,
    );

    const rangeInput = screen.getByLabelText('Zoom', {
      selector: 'input[type="range"]',
    });

    fireEvent.change(rangeInput, { target: { value: '2.5' } });
    expect(onChange).toHaveBeenCalledWith(2.5);

    fireEvent.pointerUp(rangeInput);
    expect(onChangeEnd).toHaveBeenCalledWith(2.5);
  });
});
