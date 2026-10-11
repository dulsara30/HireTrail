import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner atom', () => {
  it('renders status role with accessible label', () => {
    render(<Spinner label="Loading items..." />);
    const spinner = screen.getByRole('status', { name: /loading items/i });
    expect(spinner).toBeInTheDocument();
  });
});
