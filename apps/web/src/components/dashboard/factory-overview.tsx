'use client';

import { useEffect, useState } from 'react';
import { UserFactory, Resource, Building, Item, UserExtractorWithDetails } from '@globus/core/types/database';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExtractorsTab } from './tabs/extractors-tab';
import { ProductionTab } from './tabs/production-tab';
import { AnalysisTab } from './tabs/analysis-tab';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';

interface FactoryOverviewProps {
  factory: UserFactory;
  resources: Resource[];
  buildings: Building[];
  items: Item[];
}

export function FactoryOverview({ factory, resources, buildings, items }: FactoryOverviewProps) {
  const [extractors, setExtractors] = useState<UserExtractorWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadFactoryData();
  }, [factory.id]);

  const loadFactoryData = async () => {
    setLoading(true);

    // Charger les extracteurs avec leurs relations
    const { data: extractorsData } = await supabase
      .from('user_extractors')
      .select(`
        *,
        resource:resources(*),
        building:buildings(*)
      `)
      .eq('factory_id', factory.id);

    if (extractorsData) {
      setExtractors(extractorsData as any);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
        <p className="text-gray-600">Chargement des données...</p>
      </Card>
    );
  }

  return (
    <div>
      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">{factory.name}</h2>
        {factory.description && (
          <p className="text-gray-600">{factory.description}</p>
        )}
      </Card>

      <Tabs defaultValue="extractors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="extractors">⛏️ Extracteurs</TabsTrigger>
          <TabsTrigger value="production">🏗️ Production</TabsTrigger>
          <TabsTrigger value="analysis">📊 Analyse</TabsTrigger>
        </TabsList>

        <TabsContent value="extractors">
          <ExtractorsTab
            factory={factory}
            extractors={extractors}
            resources={resources}
            buildings={buildings}
            onUpdate={loadFactoryData}
          />
        </TabsContent>

        <TabsContent value="production">
          <ProductionTab
            factory={factory}
            items={items}
            buildings={buildings}
          />
        </TabsContent>

        <TabsContent value="analysis">
          <AnalysisTab
            factory={factory}
            extractors={extractors}
            items={items}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
