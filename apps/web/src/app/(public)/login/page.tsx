import React from 'react';
import { AuthTemplate } from '../../../components/templates/AuthTemplate';
import { LoginForm } from '../../../components/organisms/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthTemplate title="Welcome back" subtitle="Sign in to track your job search">
      <LoginForm />
    </AuthTemplate>
  );
}
