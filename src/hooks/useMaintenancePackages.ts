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
  ready_for_service_order: boolean;
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

// Fetch packages ready for service order (for Super Admin in ServiceOrders)
export function useReadyForServiceOrderPackages() {
  return useQuery({
    queryKey: ['maintenance-packages', 'ready-for-so'],
    queryFn: async (): Promise<MaintenancePackage[]> => {
      const { data, error } = await supabase
        .from('maintenance_approval_packages')
        .select(`
          *,
          creator:created_by(name),
          director:director_id(name)
        `)
        .eq('ready_for_service_order', true)
        .in('status', ['approved', 'partially_held'])
        .order('reviewed_at', { ascending: false });

      if (error) throw error;
      
      // Fetch items for each package
      const packages = (data || []) as unknown as MaintenancePackage[];
      for (const pkg of packages) {
        const { data: items } = await supabase
          .from('maintenance_package_items')
          .select(`
            *,
            outdoor:outdoor_id(
              id, code, location, photo_url, non_operational_reason,
              pdv:pdv_id(name, city, state)
            ),
            evaluation:evaluation_id(
              id, observations, evaluated_at,
              evaluator:evaluator_id(name)
            )
          `)
          .eq('package_id', pkg.id)
          .eq('status', 'approved');
        
        pkg.items = (items || []) as unknown as MaintenancePackageItem[];
      }
      
      return packages.filter(pkg => (pkg.items?.length || 0) > 0);
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

      // Fetch creator name for rich notification
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      const creatorName = creatorProfile?.name || 'Administrador';

      await notificarDiretoresAprovadores(
        'aprovacao_manutencao',
        'Pacote de Manutenção Pendente',
        `${creatorName} enviou pacote com ${input.items.length} outdoor(s) não operacional(is) para aprovação.`,
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
          packageStatus = 'partially_held';
        } else if (hasApproved) {
          packageStatus = 'approved';
        }
      }

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

      if (allReviewed) {
        // Fetch director name and item count for rich notification
        const { data: directorProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        const directorName = directorProfile?.name || 'Diretor(a)';
        const itemCount = allItems?.length || 0;

        const statusLabel = 
          packageStatus === 'approved' ? 'aprovado' : 
          packageStatus === 'rejected' ? 'rejeitado' : 
          packageStatus === 'partially_held' ? 'parcialmente segurado' : 
          'parcialmente aprovado';
        
        await notificarPorRole(
          'super_admin',
          'aprovacao_manutencao',
          'media',
          hasHeld ? 'Pacote Aguardando Reavaliação' : 'Pacote Revisado pela Diretoria',
          `${directorName} ${statusLabel} pacote com ${itemCount} outdoor(s).${hasHeld ? ' Alguns itens foram segurados para reavaliação.' : ''}`,
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

// Mark package as ready for service order (Director action)
export function useMarkReadyForServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await supabase
        .from('maintenance_approval_packages')
        .update({ ready_for_service_order: true })
        .eq('id', packageId);

      if (error) throw error;

      // Fetch director name and items count for rich notification
      const { data: { user } } = await supabase.auth.getUser();
      let directorName = 'Diretor(a)';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        directorName = profile?.name || 'Diretor(a)';
      }

      const { count: itemCount } = await supabase
        .from('maintenance_package_items')
        .select('id', { count: 'exact', head: true })
        .eq('package_id', packageId)
        .eq('status', 'approved');

      await notificarPorRole(
        'super_admin',
        'ordem_servico',
        'media',
        'Manutenção Pronta para OS',
        `${directorName} enviou pacote com ${itemCount || 0} outdoor(s) aprovado(s) para geração de OS.`,
        '/service-orders',
        packageId,
        'maintenance_package'
      );

      return packageId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-packages'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-package'] });
      showToast.success('Pacote enviado para Ordem de Serviço');
    },
    onError: (error: Error) => {
      showToast.error('Erro ao enviar para OS', error.message);
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

// Check which outdoor IDs are currently in maintenance packages
export function useOutdoorsInMaintenancePackages() {
  return useQuery({
    queryKey: ['outdoors-in-maintenance-packages'],
    queryFn: async (): Promise<Map<string, { packageStatus: string; itemStatus: string }>> => {
      const { data, error } = await supabase
        .from('maintenance_package_items')
        .select(`
          outdoor_id,
          status,
          package:package_id(status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const map = new Map<string, { packageStatus: string; itemStatus: string }>();
      data?.forEach(item => {
        if (!map.has(item.outdoor_id)) {
          const pkg = item.package as any;
          map.set(item.outdoor_id, {
            packageStatus: pkg?.status || 'unknown',
            itemStatus: item.status,
          });
        }
      });

      return map;
    },
  });
}
