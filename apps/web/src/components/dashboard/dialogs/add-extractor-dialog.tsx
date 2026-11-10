'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Resource, Building, Purity, UserExtractorWithDetails } from '@globus/core/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface AddExtractorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  factoryId: string;
  resources: Resource[];
  buildings: Building[];
  editingExtractor?: UserExtractorWithDetails | null;
}

// Débits de base des mineurs (items/min pour un nœud normal à 100%)
const MINER_BASE_RATES: Record<string, number> = {
  miner_mk1: 60,
  miner_mk2: 120,
  miner_mk3: 240,
  water_extractor: 120,
  oil_extractor: 120,
  resource_well_pressurizer: 150,
};

export function AddExtractorDialog({
  open,
  onClose,
  onSuccess,
  factoryId,
  resources,
  buildings,
  editingExtractor,
}: AddExtractorDialogProps) {
  const [resourceId, setResourceId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [purity, setPurity] = useState<Purity>('normal');
  const [overclock, setOverclock] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (editingExtractor) {
      setResourceId(editingExtractor.resource_id);
      setBuildingId(editingExtractor.building_id);
      setQuantity(editingExtractor.quantity);
      setPurity(editingExtractor.purity);
      setOverclock(editingExtractor.overclock_percentage);
    } else {
      setResourceId('');
      setBuildingId('');
      setQuantity(1);
      setPurity('normal');
      setOverclock(100);
    }
  }, [editingExtractor, open]);

  const calculateExtractionRate = () => {
    if (!buildingId) return 0;
    
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return 0;

    const baseRate = MINER_BASE_RATES[building.name] || 60;
    const purityMultiplier = purity === 'impure' ? 0.5 : purity === 'pure' ? 2 : 1;
    
    return baseRate * purityMultiplier * (overclock / 100) * quantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const extractionRate = calculateExtractionRate();

    const extractorData = {
      factory_id: factoryId,
      resource_id: resourceId,
      building_id: buildingId,
      quantity,
      purity,
      overclock_percentage: overclock,
      extraction_rate: extractionRate,
    };

    let result;
    if (editingExtractor) {
      result = await supabase
        .from('user_extractors')
        .update(extractorData)
        .eq('id', editingExtractor.id);
    } else {
      result = await supabase
        .from('user_extractors')
        .insert(extractorData);
    }

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  };

  if (!open) return null;

  const selectedBuilding = buildings.find(b => b.id === buildingId);
  const extractionRate = calculateExtractionRate();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {editingExtractor ? 'Modifier l\'extracteur' : 'Ajouter un extracteur'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="resource">Ressource / Minerai *</Label>
            <Select value={resourceId} onValueChange={setResourceId} required disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Choisis une ressource" />
              </SelectTrigger>
              <SelectContent>
                {resources.map((resource) => (
                  <SelectItem key={resource.id} value={resource.id}>
                    {resource.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="building">Type de mineur *</Label>
            <Select value={buildingId} onValueChange={setBuildingId} required disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Choisis un mineur" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.display_name} ({building.power_consumption} MW)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="purity">Pureté du nœud *</Label>
            <Select value={purity} onValueChange={(v) => setPurity(v as Purity)} required disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="impure">Impur (50%)</SelectItem>
                <SelectItem value="normal">Normal (100%)</SelectItem>
                <SelectItem value="pure">Pur (200%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">Nombre d&apos;extracteurs *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="overclock">Overclock (%) *</Label>
            <Input
              id="overclock"
              type="number"
              min="1"
              max="250"
              value={overclock}
              onChange={(e) => setOverclock(parseInt(e.target.value) || 100)}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              100% = normal, 250% = maximum
            </p>
          </div>

          {/* Résumé du calcul */}
          {buildingId && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Résumé</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Extraction totale:</span>
                  <span className="font-bold text-orange-600">{extractionRate.toFixed(1)} /min</span>
                </div>
                <div className="flex justify-between">
                  <span>Consommation:</span>
                  <span className="font-medium">
                    {selectedBuilding && (selectedBuilding.power_consumption * quantity * (overclock / 100)).toFixed(1)} MW
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !resourceId || !buildingId} className="flex-1">
              {loading ? 'Enregistrement...' : editingExtractor ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
