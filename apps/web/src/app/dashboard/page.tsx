import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata = {
  title: 'Dashboard - FicsitManager',
  description: 'Vue d\'ensemble de ton usine Satisfactory',
};

export default async function DashboardPage() {
  const supabase = await createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Récupérer les usines de l'utilisateur
  const { data: factories } = await supabase
    .from('user_factories')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Récupérer les ressources et items pour affichage
  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .order('display_name');

  const { data: buildings } = await supabase
    .from('buildings')
    .select('*')
    .order('display_name');

  const { data: items } = await supabase
    .from('items')
    .select('*')
    .order('display_name');

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardView
        user={user}
        factories={factories || []}
        resources={resources || []}
        buildings={buildings || []}
        items={items || []}
      />
    </div>
  );
}
