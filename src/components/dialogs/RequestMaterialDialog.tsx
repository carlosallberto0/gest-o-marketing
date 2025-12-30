import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';

import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateMaterialRequest } from '@/hooks/useMaterialRequests';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Package, Search, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

interface RequestMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedMaterialId?: string;
}

const requestSchema = z.object({
  materials: z
    .array(
      z.object({
        material_id: z.string(),
        quantity: z.number().min(1, 'Quantidade deve ser maior que 0'),
      })
    )
    .min(1, 'Selecione pelo menos um material'),
  pdv_id: z.string().min(1, 'Selecione um PDV'),
  justification: z
    .string()
    .min(10, 'Justificativa deve ter pelo menos 10 caracteres')
    .max(500, 'Justificativa deve ter no máximo 500 caracteres'),
});

export function RequestMaterialDialog({ open, onOpenChange, preselectedMaterialId }: RequestMaterialDialogProps) {
  const [selectedMaterials, setSelectedMaterials] = useState<Record<string, number>>({});
  const [pdvId, setPdvId] = useState('');
  const [justification, setJustification] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { profile } = useAuth();
  const createRequest = useCreateMaterialRequest();
  
  const isAdminOrDirector = ['super_admin', 'admin', 'director', 'coordenador_compras'].includes(profile?.role || '');

  // Fetch materials
  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ['trade-materials-for-request'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_materials')
        .select('id, name, code, type, current_stock, minimum_stock')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch PDVs
  const { data: pdvs = [], isLoading: loadingPdvs } = useQuery({
    queryKey: ['pdvs-for-request', profile?.pdv_id, profile?.role],
    queryFn: async () => {
      let query = supabase
        .from('pdvs')
        .select('id, name, code')
        .eq('status', 'active');
      
      if (!isAdminOrDirector && profile?.pdv_id) {
        query = query.eq('id', profile.pdv_id);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  // Pre-select user's PDV for non-admin users
  useEffect(() => {
    if (!isAdminOrDirector && profile?.pdv_id && pdvs.length > 0 && !pdvId) {
      setPdvId(profile.pdv_id);
    }
  }, [profile, pdvs, isAdminOrDirector, pdvId]);

  // Pre-select material if provided
  useEffect(() => {
    if (preselectedMaterialId && materials.length > 0) {
      setSelectedMaterials((prev) => ({
        ...prev,
        [preselectedMaterialId]: prev[preselectedMaterialId] || 1,
      }));
    }
  }, [preselectedMaterialId, materials]);

  const resetForm = () => {
    setSelectedMaterials({});
    setPdvId(isAdminOrDirector ? '' : profile?.pdv_id || '');
    setJustification('');
    setSearchTerm('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterials((prev) => {
      const newSelected = { ...prev };
      if (newSelected[materialId] !== undefined) {
        delete newSelected[materialId];
      } else {
        newSelected[materialId] = 1;
      }
      return newSelected;
    });
  };

  const updateQuantity = (materialId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedMaterials((prev) => ({
      ...prev,
      [materialId]: quantity,
    }));
  };

  const handleSubmit = async () => {
    const items = Object.entries(selectedMaterials).map(([material_id, quantity]) => ({
      material_id,
      quantity,
    }));

    const result = requestSchema.safeParse({
      materials: items,
      pdv_id: pdvId,
      justification: justification.trim(),
    });

    if (!result.success) {
      result.error.errors.forEach((err) => toast.error(err.message));
      return;
    }

    try {
      await createRequest.mutateAsync({
        items,
        pdv_id: pdvId,
        justification: justification.trim(),
      });
      handleClose();
    } catch {
      // Error handled in mutation
    }
  };

  const filteredMaterials = materials.filter(
    (material) =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = Object.keys(selectedMaterials).length;
  const isLoading = loadingMaterials || loadingPdvs;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Solicitar Materiais
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* PDV Selection */}
            <div className="space-y-2">
              <Label htmlFor="pdv">PDV de Destino *</Label>
              <Select value={pdvId} onValueChange={setPdvId} disabled={!isAdminOrDirector}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o PDV" />
                </SelectTrigger>
                <SelectContent>
                  {pdvs.map((pdv) => (
                    <SelectItem key={pdv.id} value={pdv.id}>
                      <div className="flex items-center gap-2">
                        <span>{pdv.name}</span>
                        <span className="text-xs text-muted-foreground">({pdv.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar material por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected count badge */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedCount} {selectedCount === 1 ? 'material selecionado' : 'materiais selecionados'}
                </Badge>
              </div>
            )}

            {/* Materials count */}
            <p className="text-xs text-muted-foreground">
              {filteredMaterials.length} de {materials.length} materiais disponíveis
            </p>

            {/* Materials list - Grid layout showing all materials */}
            <div className="border rounded-lg p-2">
              {filteredMaterials.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum material encontrado
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredMaterials.map((material) => {
                    const isSelected = selectedMaterials[material.id] !== undefined;
                    const quantity = selectedMaterials[material.id] || 1;
                    const exceedsStock = quantity > material.current_stock;

                    return (
                      <div
                        key={material.id}
                        className={`flex items-center gap-2 p-1.5 rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-background hover:bg-muted/50 border-border/50'
                        }`}
                      >
                        <Checkbox
                          id={`material-${material.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleMaterial(material.id)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`material-${material.id}`}
                            className="font-medium cursor-pointer block truncate text-xs"
                          >
                            {material.name}
                          </label>
                          <span className="text-[10px] text-muted-foreground">
                            {material.code} • Est: {material.current_stock}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <Input
                              id={`qty-${material.id}`}
                              type="number"
                              min={1}
                              value={quantity}
                              onChange={(e) =>
                                updateQuantity(material.id, parseInt(e.target.value) || 1)
                              }
                              className={`w-12 h-6 text-center text-xs px-1 ${exceedsStock ? 'border-destructive' : ''}`}
                            />
                            {exceedsStock && (
                              <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Justification */}
            <div className="space-y-2">
              <Label htmlFor="justification">Justificativa *</Label>
              <Textarea
                id="justification"
                placeholder="Explique por que precisa destes materiais..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {justification.length}/500 caracteres
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRequest.isPending || selectedCount === 0}
          >
            {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar Solicitação{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
