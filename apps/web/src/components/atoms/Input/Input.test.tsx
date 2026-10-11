import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input atom', () => {
  it('renders input with placeholder', () => {
    render(<Input placeholder="Enter role..." />);
    expect(screen.getByPlaceholderText('Enter role...')).toBeInTheDocument();
  });

  it('updates value on change', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Frontend Dev' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('applies error styling when hasError is true', () => {
    render(<Input hasError data-testid="error-input" />);
    const input = screen.getByTestId('error-input');
    expect(input.className).toContain('border-border-danger');
  });
});
