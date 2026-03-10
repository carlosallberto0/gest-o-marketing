import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/lib/toast';
import { notificarPorRole } from '@/hooks/useNotificacoes';

export interface OutdoorMonthlyReview {
  id: string;
  outdoor_id: string;
  reviewer_id: string;
  review_month: string;
  status: 'approved' | 'needs_maintenance';
  current_photo_url: string | null;
  observations: string | null;
  created_at: string;
  outdoor?: {
    id: string;
    code: string;
    location: string;
    photo_url: string | null;
    pdv?: {
      id: string;
      name: string;
      city: string;
      state: string;
    };
  };
  reviewer?: {
    id: string;
    name: string;
  };
}

export interface CreateMonthlyReviewInput {
  outdoor_id: string;
  status: 'approved' | 'needs_maintenance';
  current_photo_url?: string;
  observations?: string;
}

// Hook para buscar revisões do mês atual
export function useCurrentMonthReviews() {
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
  
  return useQuery({
    queryKey: ['outdoor-monthly-reviews', currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outdoor_monthly_reviews')
        .select(`
          *,
          outdoor:outdoors(
            id,
            code,
            location,
            photo_url,
            pdv:pdvs(id, name, city, state)
          ),
          reviewer:profiles(id, name)
        `)
        .gte('review_month', currentMonth)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OutdoorMonthlyReview[];
    },
  });
}

// Hook para buscar todas revisões
export function useAllMonthlyReviews() {
  return useQuery({
    queryKey: ['outdoor-monthly-reviews', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outdoor_monthly_reviews')
        .select(`
          *,
          outdoor:outdoors(
            id,
            code,
            location,
            photo_url,
            pdv:pdvs(id, name, city, state)
          ),
          reviewer:profiles(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OutdoorMonthlyReview[];
    },
  });
}

// Hook para criar revisão mensal
export function useCreateMonthlyReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMonthlyReviewInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const reviewMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01

      const { data, error } = await supabase
        .from('outdoor_monthly_reviews')
        .insert({
          outdoor_id: input.outdoor_id,
          reviewer_id: user.id,
          review_month: reviewMonth,
          status: input.status,
          current_photo_url: input.current_photo_url || null,
          observations: input.observations || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar a foto principal do outdoor se uma nova foto foi enviada
      if (input.current_photo_url) {
        await supabase.rpc('update_outdoor_after_evaluation', {
          p_outdoor_id: input.outdoor_id,
          p_status: 'operational', // Revisão mensal mantém status operacional
          p_non_operational_reason: null,
          p_photo_url: input.current_photo_url,
        });
      }

      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['outdoor-monthly-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] });
      showToast.success('Revisão mensal registrada com sucesso!');
      
      // Notify super_admin when outdoor needs maintenance
      if (variables.status === 'needs_maintenance') {
        // Fetch outdoor code and PDV name for rich notification
        let outdoorCode = '';
        let pdvName = '';
        try {
          const { data: outdoorInfo } = await supabase
            .from('outdoors')
            .select('code, pdvs:pdv_id(name)')
            .eq('id', variables.outdoor_id)
            .single();
          outdoorCode = (outdoorInfo as any)?.code || '';
          pdvName = (outdoorInfo as any)?.pdvs?.name || '';
        } catch {}

        const locationLabel = pdvName ? `${outdoorCode} (${pdvName})` : outdoorCode;

        try {
          await notificarPorRole(
            'super_admin',
            'outdoor_review',
            'media',
            `Manutenção Necessária: ${outdoorCode}`,
            `${locationLabel} marcado como precisando de manutenção na revisão mensal`,
            '/maintenance-requests',
            data.id,
            'outdoor_monthly_review'
          );
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      }
    },
    onError: (error: Error) => {
      console.error('Error creating monthly review:', error);
      if (error.message.includes('duplicate')) {
        showToast.error('Este outdoor já foi avaliado neste mês');
      } else {
        showToast.error('Erro ao registrar revisão mensal');
      }
    },
  });
}

// Hook para resumo mensal (para super_admin)
export function useMonthlyReviewSummary() {
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  return useQuery({
    queryKey: ['outdoor-monthly-reviews', 'summary', currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outdoor_monthly_reviews')
        .select(`
          id,
          outdoor_id,
          status,
          current_photo_url,
          observations,
          created_at,
          outdoor:outdoors(
            id,
            code,
            photo_url,
            pdv:pdvs(id, name, city, state)
          ),
          reviewer:profiles(id, name)
        `)
        .gte('review_month', currentMonth)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reviews = data as OutdoorMonthlyReview[];
      const approved = reviews.filter(r => r.status === 'approved');
      const needsMaintenance = reviews.filter(r => r.status === 'needs_maintenance');

      return {
        total: reviews.length,
        approved: approved.length,
        needsMaintenance: needsMaintenance.length,
        approvedList: approved,
        maintenanceList: needsMaintenance,
      };
    },
  });
}

// Verificar se outdoor já foi avaliado no mês atual
export function useIsOutdoorReviewedThisMonth(outdoorId: string | undefined) {
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  return useQuery({
    queryKey: ['outdoor-monthly-reviews', 'check', outdoorId, currentMonth],
    queryFn: async () => {
      if (!outdoorId) return false;

      const { data, error } = await supabase
        .from('outdoor_monthly_reviews')
        .select('id')
        .eq('outdoor_id', outdoorId)
        .gte('review_month', currentMonth)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!outdoorId,
  });
}
