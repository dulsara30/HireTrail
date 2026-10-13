import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StarRating } from './StarRating';

describe('StarRating molecule', () => {
  it('reports the clicked star and clears when the same star is clicked again', () => {
    const onChange = vi.fn();
    const { rerender } = render(<StarRating value={null} onChange={onChange} label="Rating" />);

    fireEvent.click(screen.getByRole('button', { name: '3 stars' }));
    expect(onChange).toHaveBeenLastCalledWith(3);

    rerender(<StarRating value={3} onChange={onChange} label="Rating" />);
    fireEvent.click(screen.getByRole('button', { name: '3 stars' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('is not clickable when read only', () => {
    const onChange = vi.fn();
    render(<StarRating value={4.5} readOnly onChange={onChange} label="Average" />);
    const star = screen.getByRole('button', { name: '2 stars' });
    expect(star).toBeDisabled();
    fireEvent.click(star);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Average' })).toBeInTheDocument();
  });
});
