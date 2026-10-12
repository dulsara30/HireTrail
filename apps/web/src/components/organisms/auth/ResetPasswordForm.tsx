'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import { resetPasswordSchema } from '@hiretrail/shared';
import { useResetPassword } from '../../../api/hooks/mutations/useResetPassword';
import { FormField } from '../../molecules/FormField';
import { PasswordInput } from '../../molecules/PasswordInput';
import { Button } from '../../atoms/Button';
import { mapServerErrors } from '../../../utils/validation/mapServerErrors';
import { ROUTES } from '../../../constants/routes';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const resetMutation = useResetPassword();
  const [generalError, setGeneralError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ token, newPassword: '' }}
      validationSchema={resetPasswordSchema}
      onSubmit={async (values, { setFieldError, setSubmitting }) => {
        setGeneralError(null);
        try {
          await resetMutation.mutateAsync(values);
          router.push('/login?reset=success');
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

          <p className="text-sm text-text-secondary">
            Enter a new password for your HireTrail account.
          </p>

          <FormField
            label="New password"
            htmlFor="newPassword"
            caption="Must be at least 8 chars, including uppercase, lowercase, and a number"
            error={touched.newPassword && errors.newPassword ? errors.newPassword : undefined}
          >
            <PasswordInput
              {...getFieldProps('newPassword')}
              placeholder="Enter new password"
              hasError={Boolean(touched.newPassword && errors.newPassword)}
            />
          </FormField>

          <Button type="submit" variant="primary" className="w-full mt-2" disabled={isSubmitting}>
            {isSubmitting ? 'Updating password...' : 'Update password'}
          </Button>

          <div className="text-center text-sm text-text-secondary mt-4">
            <Link href={ROUTES.login} className="text-text-accent font-medium hover:underline">
              Back to sign in
            </Link>
          </div>
        </Form>
      )}
    </Formik>
  );
}
