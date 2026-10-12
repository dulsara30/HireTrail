'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form, Field } from 'formik';
import { loginSchema, LoginInput } from '@hiretrail/shared';
import { useLogin } from '../../../api/hooks/mutations/useLogin';
import { FormField } from '../../molecules/FormField';
import { PasswordInput } from '../../molecules/PasswordInput';
import { Button } from '../../atoms/Button';
import { GoogleAuthButton } from './GoogleAuthButton';
import { mapServerErrors } from '../../../utils/validation/mapServerErrors';
import { ROUTES } from '../../../constants/routes';

export function LoginForm() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const initialValues: LoginInput = {
    email: '',
    password: '',
  };

  return (
    <div className="space-y-6">
      <GoogleAuthButton label="Sign in with Google" />

      <div className="flex items-center gap-3" role="separator" aria-label="Or continue with email">
        <span className="h-px flex-1 bg-border-default" />
        <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Or with email
        </span>
        <span className="h-px flex-1 bg-border-default" />
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={loginSchema}
        onSubmit={async (values, { setFieldError, setSubmitting }) => {
          setGeneralError(null);
          try {
            await loginMutation.mutateAsync(values);
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
              error={touched.password && errors.password ? errors.password : undefined}
            >
              <PasswordInput
                {...getFieldProps('password')}
                placeholder="Enter password"
                hasError={Boolean(touched.password && errors.password)}
              />
            </FormField>

            <div className="flex items-center justify-end">
              <Link
                href={ROUTES.forgotPassword}
                className="text-xs text-text-accent hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="text-center text-sm text-text-secondary mt-4">
              Don&apos;t have an account?{' '}
              <Link href={ROUTES.register} className="text-text-accent font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
