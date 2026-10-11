import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge';

describe('Badge atom', () => {
  it('renders text with default neutral styling', () => {
    render(<Badge>Applied</Badge>);
    const badge = screen.getByText('Applied');
    expect(badge).toBeInTheDocument();
  });

  it('renders dot indicator when dot is true', () => {
    const { container } = render(
      <Badge dot color="success">
        Offer
      </Badge>,
    );
    const dotSpan = container.querySelector('.rounded-full');
    expect(dotSpan).toBeInTheDocument();
  });
});
