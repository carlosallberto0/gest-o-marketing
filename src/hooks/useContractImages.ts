import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

interface ContractImage {
  id: string;
  contract_id: string;
  image_url: string;
  page_order: number;
  created_at: string;
}

export function useContractImages(contractId: string | null) {
  return useQuery({
    queryKey: ['contract-images', contractId],
    queryFn: async () => {
      if (!contractId) return [];
      
      const { data, error } = await supabase
        .from('contract_images')
        .select('*')
        .eq('contract_id', contractId)
        .order('page_order');

      if (error) throw error;
      return data as ContractImage[];
    },
    enabled: !!contractId,
  });
}

export function useAddContractImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, imageUrls }: { contractId: string; imageUrls: string[] }) => {
      const images = imageUrls.map((url, index) => ({
        contract_id: contractId,
        image_url: url,
        page_order: index,
      }));

      const { data, error } = await supabase
        .from('contract_images')
        .insert(images)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-images', variables.contractId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error) => {
      console.error('Error adding contract images:', error);
      showToast.error('Erro ao adicionar imagens do contrato');
    },
  });
}

export function useDeleteContractImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from('contract_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-images'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: (error) => {
      console.error('Error deleting contract image:', error);
      showToast.error('Erro ao remover imagem do contrato');
    },
  });
}

export function useUpdateContractImagesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractId, images }: { contractId: string; images: { id: string; page_order: number }[] }) => {
      for (const img of images) {
        const { error } = await supabase
          .from('contract_images')
          .update({ page_order: img.page_order })
          .eq('id', img.id);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-images', variables.contractId] });
    },
    onError: (error) => {
      console.error('Error updating image order:', error);
      showToast.error('Erro ao reordenar imagens');
    },
  });
}
