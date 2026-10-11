import React, { type ReactNode } from 'react';

interface AppShellTemplateProps {
  children: ReactNode;
}

export const AppShellTemplate: React.FC<AppShellTemplateProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-bg-page text-text-primary">
      {/* Top Header */}
      <header className="h-16 border-b border-border-default bg-bg-surface px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-bg-inverse text-text-inverse flex items-center justify-center font-bold text-sm tracking-wide">
            HT
          </div>
          <span className="font-bold text-lg text-text-primary">HireTrail</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-text-secondary">
          <span className="text-xs px-2 py-1 rounded bg-bg-accent-subtle text-text-accent font-medium">
            Phase 0: Foundation
          </span>
        </nav>
      </header>

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">{children}</main>
    </div>
  );
};

AppShellTemplate.displayName = 'AppShellTemplate';
