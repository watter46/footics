import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayerBasicFormFields, POSITIONS } from '../player-basic-form-fields';

describe('PlayerBasicFormFields rendering & options', () => {
  it('renders input fields with initial values and options', () => {
    render(
      <PlayerBasicFormFields
        name="Enzo Fernández"
        shirtNo={8}
        position="MID"
        onNameChange={vi.fn()}
        onShirtNoChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/選手名/i) as HTMLInputElement;
    const shirtNoInput = screen.getByLabelText(/背番号/i) as HTMLInputElement;
    const positionSelect = screen.getByLabelText(
      /ポジション/i,
    ) as HTMLSelectElement;

    expect(nameInput.value).toBe('Enzo Fernández');
    expect(shirtNoInput.value).toBe('8');
    expect(positionSelect.value).toBe('MID');
    expect(POSITIONS.length).toBe(5);
  });

  it('uses custom IDs for accessibility labels if provided', () => {
    render(
      <PlayerBasicFormFields
        name="Robert Sánchez"
        shirtNo={1}
        position="GK"
        onNameChange={vi.fn()}
        onShirtNoChange={vi.fn()}
        onPositionChange={vi.fn()}
        nameId="custom-name-id"
        shirtNoId="custom-shirt-id"
        positionId="custom-pos-id"
      />,
    );

    expect(screen.getByLabelText(/選手名/i).id).toBe('custom-name-id');
    expect(screen.getByLabelText(/背番号/i).id).toBe('custom-shirt-id');
    expect(screen.getByLabelText(/ポジション/i).id).toBe('custom-pos-id');
  });
});

describe('PlayerBasicFormFields user interactions', () => {
  it('calls onNameChange when typing into name input', () => {
    const onNameChange = vi.fn();
    render(
      <PlayerBasicFormFields
        name=""
        shirtNo=""
        position="Other"
        onNameChange={onNameChange}
        onShirtNoChange={vi.fn()}
        onPositionChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/選手名/i), {
      target: { value: 'Cole Palmer' },
    });
    expect(onNameChange).toHaveBeenCalledWith('Cole Palmer');
  });

  it('calls onShirtNoChange with number and empty string', () => {
    const onShirtNoChange = vi.fn();
    render(
      <PlayerBasicFormFields
        name="Palmer"
        shirtNo={20}
        position="MID"
        onNameChange={vi.fn()}
        onShirtNoChange={onShirtNoChange}
        onPositionChange={vi.fn()}
      />,
    );

    const shirtNoInput = screen.getByLabelText(/背番号/i);
    fireEvent.change(shirtNoInput, { target: { value: '10' } });
    expect(onShirtNoChange).toHaveBeenCalledWith(10);

    fireEvent.change(shirtNoInput, { target: { value: '' } });
    expect(onShirtNoChange).toHaveBeenCalledWith('');
  });

  it('calls onPositionChange when selecting a different position', () => {
    const onPositionChange = vi.fn();
    render(
      <PlayerBasicFormFields
        name="Moisés Caicedo"
        shirtNo={25}
        position="MID"
        onNameChange={vi.fn()}
        onShirtNoChange={vi.fn()}
        onPositionChange={onPositionChange}
      />,
    );

    fireEvent.change(screen.getByLabelText(/ポジション/i), {
      target: { value: 'DF' },
    });
    expect(onPositionChange).toHaveBeenCalledWith('DF');
  });
});
