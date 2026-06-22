'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Package,
  History,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@globus/core/types';

interface AppShellProps {
  children: React.ReactNode;
  locale: string;
  profile: Profile;
}

export function AppShell({ children, locale, profile }: AppShellProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: `/${locale}/orders/new`, label: t('nav.newOrder'), icon: Package },
    { href: `/${locale}/orders`, label: t('nav.history'), icon: History },
    { href: `/${locale}/stats`, label: t('nav.stats'), icon: BarChart3 },
    ...(profile.role === 'admin'
      ? [{ href: `/${locale}/admin`, label: t('nav.admin'), icon: Settings }]
      : []),
  ];

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header mobile */}
      <header className="sticky top-0 z-40 border-b bg-background lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="font-semibold">{t('common.appName')}</span>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {mobileOpen && (
          <nav className="border-t p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-background">
          <div className="flex h-14 items-center border-b px-6">
            <span className="font-semibold text-lg">{t('common.appName')}</span>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t p-4">
            <p className="text-sm text-muted-foreground mb-2 truncate">{profile.full_name}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('common.logout')}
            </Button>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 lg:pl-64">
          <div className="container max-w-5xl py-6 px-4 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
