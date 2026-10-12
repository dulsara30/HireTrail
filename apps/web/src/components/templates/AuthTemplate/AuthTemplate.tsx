import React from 'react';

interface AuthTemplateProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthTemplate({ title, subtitle, children }: AuthTemplateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-canvas px-4 py-12">
      <div className="w-full max-w-md bg-bg-surface border border-border-default rounded-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">HireTrail</h1>
          <h2 className="text-lg font-semibold text-text-primary mt-4">{title}</h2>
          {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
