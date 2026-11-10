'use client';

import { useState } from 'react';
import { UserFactory, Resource, Building, UserExtractorWithDetails, Purity } from '@globus/core/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit } from 'lucide-react';
import { AddExtractorDialog } from '../dialogs/add-extractor-dialog';
import { createBrowserClient } from '@supabase/ssr';

interface ExtractorsTabProps {
  factory: UserFactory;
  extractors: UserExtractorWithDetails[];
  resources: Resource[];
  buildings: Building[];
  onUpdate: () => void;
}

export function ExtractorsTab({ factory, extractors, resources, buildings, onUpdate }: ExtractorsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingExtractor, setEditingExtractor] = useState<UserExtractorWithDetails | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleDelete = async (extractorId: string) => {
    if (!confirm('Es-tu sûr de vouloir supprimer cet extracteur ?')) return;

    const { error } = await supabase
      .from('user_extractors')
      .delete()
      .eq('id', extractorId);

    if (!error) {
      onUpdate();
    }
  };

  const purityLabel: Record<Purity, string> = {
    impure: 'Impur',
    normal: 'Normal',
    pure: 'Pur',
  };

  const purityColor: Record<Purity, string> = {
    impure: 'bg-red-100 text-red-700',
    normal: 'bg-yellow-100 text-yellow-700',
    pure: 'bg-green-100 text-green-700',
  };

  // Regrouper les extracteurs par ressource
  const extractorsByResource = extractors.reduce((acc, extractor) => {
    const resourceName = extractor.resource.display_name;
    if (!acc[resourceName]) {
      acc[resourceName] = [];
    }
    acc[resourceName].push(extractor);
    return acc;
  }, {} as Record<string, UserExtractorWithDetails[]>);

  const totalExtractionByResource = Object.entries(extractorsByResource).map(([resourceName, exts]) => ({
    resource: resourceName,
    total: exts.reduce((sum, ext) => sum + ext.extraction_rate, 0),
    count: exts.reduce((sum, ext) => sum + ext.quantity, 0),
  }));

  return (
    <div className="space-y-6">
      {/* Résumé */}
      {extractors.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Résumé de l&apos;extraction</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {totalExtractionByResource.map(({ resource, total, count }) => (
              <div key={resource} className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">{resource}</div>
                <div className="text-2xl font-bold text-orange-600">
                  {total.toFixed(1)} <span className="text-base font-normal text-gray-500">/min</span>
                </div>
                <div className="text-sm text-gray-500">{count} extracteur{count > 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Extracteurs et mineurs</h3>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un extracteur
        </Button>
      </div>

      {/* Liste des extracteurs */}
      {extractors.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">⛏️</div>
          <h4 className="text-lg font-semibold mb-2">Aucun extracteur</h4>
          <p className="text-gray-600 mb-6">
            Commence par ajouter tes mineurs et extracteurs pour suivre ta production de ressources
          </p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un extracteur
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {extractors.map((extractor) => (
            <Card key={extractor.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">
                      {extractor.resource.display_name}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${purityColor[extractor.purity]}`}>
                      {purityLabel[extractor.purity]}
                    </span>
                    {extractor.overclock_percentage !== 100 && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {extractor.overclock_percentage}%
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Bâtiment</div>
                      <div className="font-medium">{extractor.building.display_name}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Quantité</div>
                      <div className="font-medium">{extractor.quantity}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Extraction</div>
                      <div className="font-medium text-orange-600">
                        {extractor.extraction_rate.toFixed(1)} /min
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Énergie</div>
                      <div className="font-medium">
                        {(extractor.building.power_consumption * extractor.quantity * (extractor.overclock_percentage / 100)).toFixed(1)} MW
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingExtractor(extractor);
                      setShowAddDialog(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(extractor.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddExtractorDialog
        open={showAddDialog}
        onClose={() => {
          setShowAddDialog(false);
          setEditingExtractor(null);
        }}
        onSuccess={() => {
          setShowAddDialog(false);
          setEditingExtractor(null);
          onUpdate();
        }}
        factoryId={factory.id}
        resources={resources}
        buildings={buildings.filter(b => b.type === 'miner')}
        editingExtractor={editingExtractor}
      />
    </div>
  );
}
