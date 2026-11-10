'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Resource, Building, Item, UserFactory } from '@globus/core/types/database';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreateFactoryDialog } from './create-factory-dialog';
import { FactoryOverview } from './factory-overview';
import { LogOut, Plus, Factory } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface DashboardViewProps {
  user: User;
  factories: UserFactory[];
  resources: Resource[];
  buildings: Building[];
  items: Item[];
}

export function DashboardView({ user, factories, resources, buildings, items }: DashboardViewProps) {
  const [selectedFactory, setSelectedFactory] = useState<UserFactory | null>(
    factories.length > 0 ? factories[0]! : null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleFactoryCreated = () => {
    setShowCreateDialog(false);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏭</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FicsitManager</h1>
                <p className="text-sm text-gray-600">Bienvenue, {user.email?.split('@')[0]}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Factories selector */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Mes usines</h2>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle usine
            </Button>
          </div>

          {factories.length === 0 ? (
            <Card className="p-12 text-center">
              <Factory className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Aucune usine créée</h3>
              <p className="text-gray-600 mb-6">
                Commence par créer ta première usine pour gérer ta production Satisfactory
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer ma première usine
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {factories.map((factory) => (
                  <Card
                    key={factory.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                      selectedFactory?.id === factory.id
                        ? 'ring-2 ring-orange-500 border-orange-500'
                        : ''
                    }`}
                    onClick={() => setSelectedFactory(factory)}
                  >
                    <h3 className="font-semibold text-lg mb-1">{factory.name}</h3>
                    {factory.description && (
                      <p className="text-sm text-gray-600">{factory.description}</p>
                    )}
                  </Card>
                ))}
              </div>

              {selectedFactory && (
                <FactoryOverview
                  factory={selectedFactory}
                  resources={resources}
                  buildings={buildings}
                  items={items}
                />
              )}
            </>
          )}
        </div>
      </main>

      <CreateFactoryDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleFactoryCreated}
        userId={user.id}
      />
    </div>
  );
}
