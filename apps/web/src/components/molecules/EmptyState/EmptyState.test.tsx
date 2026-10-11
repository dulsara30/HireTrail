import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from './EmptyState';
import { Button } from '../../atoms/Button';

describe('EmptyState molecule', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No applications found"
        description="Get started by tracking your first application."
      />,
    );

    expect(screen.getByText('No applications found')).toBeInTheDocument();
    expect(screen.getByText('Get started by tracking your first application.')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(
      <EmptyState title="Empty Board" action={<Button variant="accent">Add Application</Button>} />,
    );

    expect(screen.getByRole('button', { name: /add application/i })).toBeInTheDocument();
  });
});
