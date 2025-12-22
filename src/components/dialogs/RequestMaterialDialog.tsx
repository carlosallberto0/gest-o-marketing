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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateMaterialRequest } from '@/hooks/useMaterialRequests';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Package } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

interface RequestMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedMaterialId?: string;
}

const requestSchema = z.object({
  material_id: z.string().min(1, 'Selecione um material'),
  pdv_id: z.string().min(1, 'Selecione um PDV'),
  quantity: z.number().min(1, 'Quantidade deve ser maior que 0'),
  justification: z.string().min(10, 'Justificativa deve ter pelo menos 10 caracteres').max(500, 'Justificativa deve ter no máximo 500 caracteres'),
});

export function RequestMaterialDialog({ open, onOpenChange, preselectedMaterialId }: RequestMaterialDialogProps) {
  const [materialId, setMaterialId] = useState(preselectedMaterialId || '');
  const [pdvId, setPdvId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [justification, setJustification] = useState('');

  const { profile } = useAuth();
  const createRequest = useCreateMaterialRequest();
  
  const isAdminOrDirector = ['super_admin', 'admin', 'director', 'coordenador_compras'].includes(profile?.role || '');

  // Fetch materials (excluding gifts for non-admin users - RLS handles this)
  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ['trade-materials-for-request'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_materials')
        .select('id, name, code, type, current_stock')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch PDVs - filter by user's pdv_id if not admin/director
  const { data: pdvs = [], isLoading: loadingPdvs } = useQuery({
    queryKey: ['pdvs-for-request', profile?.pdv_id, profile?.role],
    queryFn: async () => {
      let query = supabase
        .from('pdvs')
        .select('id, name, code')
        .eq('status', 'active');
      
      // Se não for admin/diretor, filtrar pelo PDV do usuário
      if (!isAdminOrDirector && profile?.pdv_id) {
        query = query.eq('id', profile.pdv_id);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  // Pré-selecionar PDV do gerente/colaborador automaticamente
  useEffect(() => {
    if (!isAdminOrDirector && profile?.pdv_id && pdvs.length > 0 && !pdvId) {
      setPdvId(profile.pdv_id);
    }
  }, [profile, pdvs, isAdminOrDirector, pdvId]);

  const selectedMaterial = materials.find(m => m.id === materialId);

  const handleSubmit = async () => {
    try {
      const result = requestSchema.safeParse({
        material_id: materialId,
        pdv_id: pdvId,
        quantity,
        justification: justification.trim(),
      });

      if (!result.success) {
        result.error.errors.forEach(err => toast.error(err.message));
        return;
      }

      await createRequest.mutateAsync({
        material_id: result.data.material_id,
        pdv_id: result.data.pdv_id,
        quantity: result.data.quantity,
        justification: result.data.justification,
      });
      
      // Reset form
      setMaterialId('');
      setPdvId('');
      setQuantity(1);
      setJustification('');
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => toast.error(err.message));
      }
    }
  };

  const isLoading = loadingMaterials || loadingPdvs;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Solicitar Material
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map(material => (
                    <SelectItem key={material.id} value={material.id}>
                      <div className="flex items-center gap-2">
                        <span>{material.name}</span>
                        <span className="text-xs text-muted-foreground">({material.code})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMaterial && (
                <p className="text-xs text-muted-foreground">
                  Estoque disponível: {selectedMaterial.current_stock} unidades
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdv">PDV de Destino *</Label>
              <Select value={pdvId} onValueChange={setPdvId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o PDV" />
                </SelectTrigger>
                <SelectContent>
                  {pdvs.map(pdv => (
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

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={selectedMaterial?.current_stock || 9999}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              {selectedMaterial && quantity > selectedMaterial.current_stock && (
                <p className="text-xs text-warning">
                  Atenção: quantidade solicitada maior que o estoque disponível
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Justificativa *</Label>
              <Textarea
                id="justification"
                placeholder="Explique por que precisa deste material..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {justification.length}/500 caracteres
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createRequest.isPending}
              >
                {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar Solicitação
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
