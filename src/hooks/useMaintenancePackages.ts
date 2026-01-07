import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';
import { notificarDiretoresAprovadores, notificarPorRole } from './useNotificacoes';

export interface MaintenancePackage {
  id: string;
  created_by: string;
  status: string;
  observations: string | null;
  director_id: string | null;
  director_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  creator?: { name: string };
  director?: { name: string } | null;
  items?: MaintenancePackageItem[];
}

export interface MaintenancePackageItem {
  id: string;
  package_id: string;
  outdoor_id: string;
  evaluation_id: string | null;
  status: string;
  data_revisao: string | null;
  justificativa_diretoria: string | null;
  director_notes: string | null;
  created_at: string;
  outdoor?: {
    id: string;
    code: string;
    location: string;
    photo_url: string | null;
    non_operational_reason: string | null;
    pdv?: { name: string; city: string; state: string };
  };
  evaluation?: {
    id: string;
    observations: string | null;
    evaluated_at: string;
    evaluator?: { name: string };
  };
}

// Fetch all packages
export function useMaintenancePackages() {
  return useQuery({
    queryKey: ['maintenance-packages'],
    queryFn: async (): Promise<MaintenancePackage[]> => {
      const { data, error } = await supabase
        .from('maintenance_approval_packages')
        .select(`
          *,
          creator:created_by(name),
          director:director_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MaintenancePackage[];
    },
  });
}

// Fetch pending packages for directors
export function usePendingMaintenancePackages() {
  return useQuery({
    queryKey: ['maintenance-packages', 'pending'],
    queryFn: async (): Promise<MaintenancePackage[]> => {
      const { data, error } = await supabase
        .from('maintenance_approval_packages')
        .select(`
          *,
          creator:created_by(name),
          director:director_id(name)
        `)
        .eq('status', 'pending_director')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MaintenancePackage[];
    },
  });
}

// Fetch single package with items
export function useMaintenancePackageDetails(packageId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-package', packageId],
    queryFn: async (): Promise<MaintenancePackage | null> => {
      if (!packageId) return null;

      const { data: packageData, error: packageError } = await supabase
        .from('maintenance_approval_packages')
        .select(`
          *,
          creator:created_by(name),
          director:director_id(name)
        `)
        .eq('id', packageId)
        .single();

      if (packageError) throw packageError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('maintenance_package_items')
        .select(`
          *,
          outdoor:outdoor_id(
            id,
            code,
            location,
            photo_url,
            non_operational_reason,
            pdv:pdv_id(name, city, state)
          ),
          evaluation:evaluation_id(
            id,
            observations,
            evaluated_at,
            evaluator:evaluator_id(name)
          )
        `)
        .eq('package_id', packageId)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      return {
        ...packageData,
        items: itemsData || [],
      } as unknown as MaintenancePackage;
    },
    enabled: !!packageId,
  });
}

// Create package with items
interface CreatePackageInput {
  observations?: string;
  items: {
    outdoor_id: string;
    evaluation_id?: string;
  }[];
}

export function useCreateMaintenancePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePackageInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Create the package
      const { data: packageData, error: packageError } = await supabase
        .from('maintenance_approval_packages')
        .insert({
          created_by: user.id,
          observations: input.observations,
          status: 'pending_director',
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // Create the items
      const itemsToInsert = input.items.map(item => ({
        package_id: packageData.id,
        outdoor_id: item.outdoor_id,
        evaluation_id: item.evaluation_id || null,
        status: 'pending',
      }));

      const { error: itemsError } = await supabase
        .from('maintenance_package_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Notify directors
      await notificarDiretoresAprovadores(
        'aprovacao_manutencao',
        'Pacote de Manutenção Pendente',
        `Um novo pacote com ${input.items.length} outdoor(s) não operacional(is) aguarda sua aprovação.`,
        '/maintenance-approval',
        packageData.id
      );

      return packageData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-packages'] });
      showToast.success('Pacote enviado para aprovação da diretoria');
    },
    onError: (error: Error) => {
      showToast.error('Erro ao criar pacote', error.message);
    },
  });
}

// Approve/reject/hold individual items
interface UpdateItemsInput {
  packageId: string;
  items: {
    itemId: string;
    status: 'approved' | 'rejected' | 'held';
    notes?: string;
    reviewDate?: string;
  }[];
  packageNotes?: string;
}

export function useUpdatePackageItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateItemsInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Update each item
      for (const item of input.items) {
        const { error } = await supabase
          .from('maintenance_package_items')
          .update({
            status: item.status,
            director_notes: item.notes || null,
            justificativa_diretoria: (item.status === 'rejected' || item.status === 'held') ? (item.notes || null) : null,
            data_revisao: item.status === 'held' ? (item.reviewDate || null) : null,
          })
          .eq('id', item.itemId);

        if (error) throw error;
      }

      // Check if all items have been reviewed
      const { data: allItems } = await supabase
        .from('maintenance_package_items')
        .select('status')
        .eq('package_id', input.packageId);

      const allReviewed = allItems?.every(i => i.status !== 'pending');
      const hasApproved = allItems?.some(i => i.status === 'approved');
      const hasHeld = allItems?.some(i => i.status === 'held');
      const allRejected = allItems?.every(i => i.status === 'rejected');

      let packageStatus = 'pending_director';
      if (allReviewed) {
        if (allRejected) {
          packageStatus = 'rejected';
        } else if (hasHeld) {
          packageStatus = 'partially_held'; // Notifies super admin for re-evaluation
        } else if (hasApproved) {
          packageStatus = 'approved';
        }
      }

      // Update package status
      const { error: packageError } = await supabase
        .from('maintenance_approval_packages')
        .update({
          status: packageStatus,
          director_id: user.id,
          director_notes: input.packageNotes || null,
          reviewed_at: allReviewed ? new Date().toISOString() : null,
        })
        .eq('id', input.packageId);

      if (packageError) throw packageError;

      // Notify super_admin if all reviewed
      if (allReviewed) {
        const statusLabel = 
          packageStatus === 'approved' ? 'aprovado' : 
          packageStatus === 'rejected' ? 'rejeitado' : 
          packageStatus === 'partially_held' ? 'parcialmente segurado (aguardando reavaliação)' : 
          'parcialmente aprovado';
        
        await notificarPorRole(
          'super_admin',
          'aprovacao_manutencao',
          'media',
          hasHeld ? 'Pacote de Manutenção Aguardando Reavaliação' : 'Pacote de Manutenção Revisado',
          `O pacote de manutenção foi ${statusLabel} pela diretoria.${hasHeld ? ' Alguns itens foram segurados para reavaliação.' : ''}`,
          '/maintenance-requests',
          input.packageId,
          'maintenance_package'
        );
      }

      return { packageStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-packages'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-package'] });
      showToast.success(
        data.packageStatus === 'approved' 
          ? 'Pacote aprovado com sucesso' 
          : data.packageStatus === 'rejected'
            ? 'Pacote rejeitado'
            : data.packageStatus === 'partially_held'
              ? 'Pacote com itens segurados - aguardando reavaliação'
              : 'Itens atualizados'
      );
    },
    onError: (error: Error) => {
      showToast.error('Erro ao atualizar', error.message);
    },
  });
}

// Get count of pending packages for badge
export function usePendingPackagesCount() {
  return useQuery({
    queryKey: ['maintenance-packages-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('maintenance_approval_packages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_director');

      if (error) throw error;
      return count || 0;
    },
  });
}
