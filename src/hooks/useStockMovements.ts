import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface StockMovement {
  id: string;
  material_id: string;
  user_id: string;
  movement_type: 'withdrawal' | 'entry' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  justification: string;
  created_at: string;
  material?: {
    name: string;
    code: string;
  };
  user?: {
    name: string;
  };
}

export function useStockMovements(materialId?: string) {
  return useQuery({
    queryKey: ['stock-movements', materialId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          material:trade_materials(name, code),
          user:profiles(name)
        `)
        .order('created_at', { ascending: false });

      if (materialId) {
        query = query.eq('material_id', materialId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StockMovement[];
    },
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      materialId: string;
      movementType: 'withdrawal' | 'entry' | 'adjustment';
      quantity: number;
      previousStock: number;
      justification: string;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const newStock = input.movementType === 'withdrawal' 
        ? input.previousStock - input.quantity
        : input.movementType === 'entry'
        ? input.previousStock + input.quantity
        : input.quantity; // adjustment sets directly

      if (newStock < 0) {
        throw new Error('Quantidade insuficiente em estoque');
      }

      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          material_id: input.materialId,
          user_id: user.id,
          movement_type: input.movementType,
          quantity: input.quantity,
          previous_stock: input.previousStock,
          new_stock: newStock,
          justification: input.justification,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['trade-materials'] });
      toast.success('Movimentação registrada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar movimentação');
    },
  });
}
