'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field } from 'formik';
import { registerSchema, RegisterInput } from '@hiretrail/shared';
import { useRegister } from '../../../api/hooks/mutations/useRegister';
import { FormField } from '../../molecules/FormField';
import { PasswordInput } from '../../molecules/PasswordInput';
import { Button } from '../../atoms/Button';
import { GoogleAuthButton } from './GoogleAuthButton';
import { mapServerErrors } from '../../../utils/validation/mapServerErrors';
import { ROUTES } from '../../../constants/routes';

export function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegister();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const initialValues: RegisterInput = {
    name: '',
    email: '',
    password: '',
  };

  return (
    <div className="space-y-6">
      <GoogleAuthButton label="Sign up with Google" />

      <div className="relative flex items-center justify-center">
        <div className="border-t border-border-default w-full" />
        <span className="bg-bg-surface px-3 text-xs text-text-tertiary uppercase tracking-wider relative">
          Or with email
        </span>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={registerSchema}
        onSubmit={async (values, { setFieldError, setSubmitting }) => {
          setGeneralError(null);
          try {
            await registerMutation.mutateAsync(values);
            router.push(ROUTES.dashboard);
          } catch (err) {
            const msg = mapServerErrors(err, setFieldError);
            setGeneralError(msg);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, errors, touched, getFieldProps }) => (
          <Form className="space-y-4">
            {generalError && (
              <div className="p-3 text-sm text-text-danger bg-bg-danger-subtle border border-border-danger rounded-md">
                {generalError}
              </div>
            )}

            <FormField
              label="Full name"
              htmlFor="name"
              error={touched.name && errors.name ? errors.name : undefined}
            >
              <Field
                name="name"
                type="text"
                placeholder="Jane Doe"
                className="w-full h-9 px-3 text-sm bg-bg-surface border border-border-default rounded-md text-text-primary focus:outline-none focus:border-border-inverse"
              />
            </FormField>

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

            <FormField
              label="Password"
              htmlFor="password"
              caption="Must be at least 8 chars, including uppercase, lowercase, and a number"
              error={touched.password && errors.password ? errors.password : undefined}
            >
              <PasswordInput
                {...getFieldProps('password')}
                placeholder="Create a strong password"
                hasError={Boolean(touched.password && errors.password)}
              />
            </FormField>

            <Button type="submit" variant="primary" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>

            <div className="text-center text-sm text-text-secondary mt-4">
              Already have an account?{' '}
              <Link href={ROUTES.login} className="text-text-accent font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
