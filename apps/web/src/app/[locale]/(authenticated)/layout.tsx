import { requireAuth } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';

export default async function AuthenticatedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { profile } = await requireAuth(locale);

  return (
    <AppShell locale={locale} profile={profile}>
      {children}
    </AppShell>
  );
}
