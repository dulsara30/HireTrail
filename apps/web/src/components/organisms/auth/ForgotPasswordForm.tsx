'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Formik, Form, Field } from 'formik';
import { forgotPasswordSchema, ForgotPasswordInput } from '@hiretrail/shared';
import { useForgotPassword } from '../../../api/hooks/mutations/useForgotPassword';
import { FormField } from '../../molecules/FormField';
import { Button } from '../../atoms/Button';
import { ROUTES } from '../../../constants/routes';

export function ForgotPasswordForm() {
  const forgotMutation = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);

  const initialValues: ForgotPasswordInput = {
    email: '',
  };

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="p-4 bg-bg-success-subtle border border-border-success rounded-md text-sm text-text-success">
          If an account exists with that email, a password reset link has been sent. Please check
          your inbox.
        </div>
        <Link
          href={ROUTES.login}
          className="inline-block text-sm text-text-accent font-medium hover:underline mt-4"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={forgotPasswordSchema}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          await forgotMutation.mutateAsync(values);
        } finally {
          // Always show success screen regardless of existence to avoid email enumeration
          setSubmitted(true);
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, errors, touched }) => (
        <Form className="space-y-4">
          <p className="text-sm text-text-secondary">
            Enter your account email and we&apos;ll send you a link to reset your password.
          </p>

          <FormField
            label="Email address"
            htmlFor="email"
            error={touched.email && errors.email ? errors.email : undefined}
          >
            <Field
              name="email"
              type="email"
              placeholder="you@example.com"
              className="w-full h-9 px-3 text-sm bg-bg-surface border border-border-default rounded-md text-text-primary focus:outline-none focus:border-border-inverse"
            />
          </FormField>

          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending link...' : 'Send reset link'}
          </Button>

          <div className="text-center text-sm text-text-secondary mt-4">
            Remember your password?{' '}
            <Link href={ROUTES.login} className="text-text-accent font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </Form>
      )}
    </Formik>
  );
}
