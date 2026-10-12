'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthTemplate } from '../../../components/templates/AuthTemplate';
import { VerifyEmailView } from '../../../components/organisms/auth/VerifyEmailView';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  return (
    <AuthTemplate title="Email verification" subtitle="Confirming your HireTrail account">
      <VerifyEmailView token={token} />
    </AuthTemplate>
  );
}
