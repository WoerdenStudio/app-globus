'use client';

import { UserFactory, Item, Building } from '@globus/core/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ProductionTabProps {
  factory: UserFactory;
  items: Item[];
  buildings: Building[];
}

export function ProductionTab({ factory, items, buildings }: ProductionTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lignes de production</h3>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une ligne
        </Button>
      </div>

      <Card className="p-12 text-center">
        <div className="text-4xl mb-4">🏗️</div>
        <h4 className="text-lg font-semibold mb-2">Fonctionnalité en cours de développement</h4>
        <p className="text-gray-600 mb-6">
          Tu pourras bientôt ajouter tes lignes de production (constructeurs, assembleurs, etc.)
          et suivre toute ta chaîne de fabrication.
        </p>
        <p className="text-sm text-gray-500">
          Pour l&apos;instant, concentre-toi sur tes extracteurs ! 🚀
        </p>
      </Card>
    </div>
  );
}
