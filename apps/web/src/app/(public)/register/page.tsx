import React from 'react';
import { AuthTemplate } from '../../../components/templates/AuthTemplate';
import { RegisterForm } from '../../../components/organisms/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthTemplate title="Create your account" subtitle="Start managing your job pipeline">
      <RegisterForm />
    </AuthTemplate>
  );
}
