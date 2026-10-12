'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthTemplate } from '../../../components/templates/AuthTemplate';
import { ResetPasswordForm } from '../../../components/organisms/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  return (
    <AuthTemplate title="Set new password" subtitle="Choose a strong password for your account">
      <ResetPasswordForm token={token} />
    </AuthTemplate>
  );
}
