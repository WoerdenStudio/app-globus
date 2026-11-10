'use client';

import { UserFactory, UserExtractorWithDetails, Item } from '@globus/core/types/database';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalysisTabProps {
  factory: UserFactory;
  extractors: UserExtractorWithDetails[];
  items: Item[];
}

export function AnalysisTab({ factory, extractors, items }: AnalysisTabProps) {
  // Calculer les statistiques d'extraction
  const extractionStats = extractors.map(extractor => ({
    name: extractor.resource.display_name,
    'Extraction (items/min)': parseFloat(extractor.extraction_rate.toFixed(1)),
    'Énergie (MW)': parseFloat((extractor.building.power_consumption * extractor.quantity * (extractor.overclock_percentage / 100)).toFixed(1)),
  }));

  const totalPower = extractors.reduce(
    (sum, ext) => sum + (ext.building.power_consumption * ext.quantity * (ext.overclock_percentage / 100)),
    0
  );

  const totalExtractors = extractors.reduce((sum, ext) => sum + ext.quantity, 0);

  // Regrouper par ressource pour le graphique
  const resourceGroups = extractors.reduce((acc, ext) => {
    const name = ext.resource.display_name;
    if (!acc[name]) {
      acc[name] = {
        name,
        'Extraction (items/min)': 0,
        'Énergie (MW)': 0,
      };
    }
    acc[name]['Extraction (items/min)'] += parseFloat(ext.extraction_rate.toFixed(1));
    acc[name]['Énergie (MW)'] += parseFloat((ext.building.power_consumption * ext.quantity * (ext.overclock_percentage / 100)).toFixed(1));
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(resourceGroups);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Analyse de ta production</h3>

      {extractors.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h4 className="text-lg font-semibold mb-2">Aucune donnée à analyser</h4>
          <p className="text-gray-600">
            Ajoute des extracteurs dans l&apos;onglet &quot;Extracteurs&quot; pour voir des statistiques ici
          </p>
        </Card>
      ) : (
        <>
          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-1">Extracteurs totaux</div>
              <div className="text-3xl font-bold text-orange-600">{totalExtractors}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-1">Ressources extraites</div>
              <div className="text-3xl font-bold text-orange-600">{Object.keys(resourceGroups).length}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-1">Consommation totale</div>
              <div className="text-3xl font-bold text-orange-600">
                {totalPower.toFixed(1)} <span className="text-base font-normal text-gray-500">MW</span>
              </div>
            </Card>
          </div>

          {/* Graphique des extractions */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Extraction par ressource</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Extraction (items/min)" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Graphique de la consommation d'énergie */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4">Consommation d&apos;énergie par ressource</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Énergie (MW)" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Recommandations simples */}
          <Card className="p-6">
            <h4 className="font-semibold mb-4">💡 Recommandations</h4>
            <div className="space-y-3">
              {totalPower > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm">
                    <span className="font-medium">Énergie:</span> Ta consommation totale est de{' '}
                    <span className="font-bold text-blue-700">{totalPower.toFixed(1)} MW</span>.
                    Assure-toi d&apos;avoir suffisamment de générateurs !
                  </p>
                </div>
              )}
              
              {extractors.some(e => e.overclock_percentage > 100) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm">
                    <span className="font-medium">Overclock:</span> Tu utilises l&apos;overclock sur certains extracteurs.
                    N&apos;oublie pas que ça augmente la consommation d&apos;énergie de façon exponentielle !
                  </p>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm">
                  <span className="font-medium">Production équilibrée:</span> Pense à vérifier que ta production
                  de lingots et de pièces correspond à ton extraction de minerais.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
