import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton atom', () => {
  it('renders with pulse animation class', () => {
    const { container } = render(<Skeleton width="100px" height="20px" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveStyle({ width: '100px', height: '20px' });
  });

  it('renders circle shape when circle is true', () => {
    const { container } = render(<Skeleton circle width="40px" height="40px" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded-full');
  });
});
