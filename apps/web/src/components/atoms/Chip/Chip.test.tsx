import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Chip } from './Chip';

describe('Chip atom', () => {
  it('renders label and triggers click', () => {
    const handleClick = vi.fn();
    render(<Chip onClick={handleClick}>Remote</Chip>);

    const chip = screen.getByText('Remote');
    fireEvent.click(chip);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('triggers onRemove callback when remove button clicked', () => {
    const handleRemove = vi.fn();
    render(<Chip onRemove={handleRemove}>Tag</Chip>);

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });
});
