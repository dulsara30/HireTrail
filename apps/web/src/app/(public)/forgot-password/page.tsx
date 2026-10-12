import React from 'react';
import { AuthTemplate } from '../../../components/templates/AuthTemplate';
import { ForgotPasswordForm } from '../../../components/organisms/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthTemplate title="Reset password" subtitle="We'll send you a recovery link">
      <ForgotPasswordForm />
    </AuthTemplate>
  );
}
