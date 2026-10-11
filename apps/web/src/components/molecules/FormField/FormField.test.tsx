import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormField } from './FormField';
import { Input } from '../../atoms/Input';

describe('FormField molecule', () => {
  it('renders label, input, and helper text', () => {
    render(
      <FormField id="company" label="Company Name" helperText="Enter full legal name">
        <Input id="company" />
      </FormField>,
    );

    expect(screen.getByText('Company Name')).toBeInTheDocument();
    expect(screen.getByText('Enter full legal name')).toBeInTheDocument();
  });

  it('renders error message in alert role when error is passed', () => {
    render(
      <FormField label="Email" error="Invalid email address">
        <Input hasError />
      </FormField>,
    );

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('Invalid email address');
  });

  it('renders required indicator when required is true', () => {
    render(
      <FormField label="Title" required>
        <Input />
      </FormField>,
    );

    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
