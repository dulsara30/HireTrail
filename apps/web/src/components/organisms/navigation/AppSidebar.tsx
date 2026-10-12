import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldCheck,
  UserCog,
  SlidersHorizontal,
  Table2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { type MeDto } from '@hiretrail/shared';
import { HireTrailLogo } from '../../atoms/HireTrailLogo';
import { Badge } from '../../atoms/Badge';
import { ROUTES } from '../../../constants/routes';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AppSidebarProps {
  user: MeDto;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  user,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  onSignOut,
  isSigningOut,
}) => {
  const pathname = usePathname();

  const main: NavItem[] = [
    { label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard },
    { label: 'Pipeline', href: ROUTES.pipeline, icon: Columns3 },
    { label: 'Applications', href: ROUTES.applications, icon: Table2 },
    ...(user.role === 'ADMIN'
      ? [{ label: 'Companies', href: ROUTES.companies, icon: Building2 }]
      : []),
  ];
  const config: NavItem[] = [
    { label: 'Configuration', href: ROUTES.settings.pipelineFields, icon: SlidersHorizontal },
    { label: 'Account', href: ROUTES.settings.account, icon: UserCog },
    { label: 'Security', href: ROUTES.settings.security, icon: Shield },
  ];
  const admin: NavItem[] =
    user.role === 'ADMIN' ? [{ label: 'Admin', href: '/admin', icon: ShieldCheck }] : [];

  const renderItem = (item: NavItem) => {
    const active = pathname?.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onCloseMobile}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          collapsed ? 'md:justify-center md:px-0' : ''
        } ${
          active
            ? 'bg-bg-accent text-text-primary font-semibold shadow-sm'
            : 'text-text-secondary hover:bg-bg-accent-subtle hover:text-text-primary'
        }`}
      >
        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <span className={collapsed ? 'md:sr-only' : ''}>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-bg-inverse/50 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border-default border-t-4 border-t-border-accent bg-bg-surface transition-all duration-200 md:sticky md:top-0 md:h-screen md:z-30 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'w-64 md:w-[76px]' : 'w-64'}`}
      >
        <div
          className={`flex h-16 items-center border-b border-border-default px-4 ${
            collapsed ? 'md:justify-center md:px-0' : 'justify-between'
          }`}
        >
          <Link href={ROUTES.dashboard} onClick={onCloseMobile} aria-label="HireTrail home">
            <HireTrailLogo size="md" showText={!collapsed} />
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1.5 text-text-secondary hover:bg-bg-muted md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            <p
              className={`px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-tertiary ${
                collapsed ? 'md:hidden' : ''
              }`}
            >
              Workspace
            </p>
            {main.map(renderItem)}
          </div>
          <div className="space-y-1">
            <p
              className={`px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-tertiary ${
                collapsed ? 'md:hidden' : ''
              }`}
            >
              Settings
            </p>
            {config.map(renderItem)}
          </div>
          {admin.length > 0 && (
            <div className="space-y-1">
              <p
                className={`px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-tertiary ${
                  collapsed ? 'md:hidden' : ''
                }`}
              >
                Admin
              </p>
              {admin.map(renderItem)}
            </div>
          )}
        </nav>

        <div className="border-t border-border-default p-3 space-y-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-muted md:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                Collapse
              </>
            )}
          </button>

          <div
            className={`flex items-center gap-3 rounded-xl bg-bg-accent-subtle border border-border-accent p-2.5 ${
              collapsed ? 'md:justify-center md:p-1.5' : ''
            }`}
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-bg-inverse text-xs font-bold text-text-inverse"
              aria-hidden="true"
            >
              {initials(user.name)}
            </span>
            <div className={`min-w-0 flex-1 ${collapsed ? 'md:hidden' : ''}`}>
              <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
              <Badge color={user.plan === 'PRO' ? 'accent' : 'neutral'}>{user.plan}</Badge>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
            title={collapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-danger-subtle hover:text-text-danger disabled:opacity-50 ${
              collapsed ? 'md:justify-center md:px-0' : ''
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className={collapsed ? 'md:sr-only' : ''}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
