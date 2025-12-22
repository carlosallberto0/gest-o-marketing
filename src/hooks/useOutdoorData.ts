import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Outdoor, OutdoorStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { notificarPorRole } from '@/hooks/useNotificacoes';

interface OutdoorWithPDV {
  id: string;
  code: string;
  location: string;
  width: number;
  height: number;
  area: number | null;
  photo_url: string | null;
  contract_id: string | null;
  status: string;
  last_evaluation: string | null;
  non_operational_reason: string | null;
  pdv_id: string;
  lat: number | null;
  lng: number | null;
  validation_radius_meters: number | null;
  pdvs: {
    name: string;
  } | null;
}

export function useOutdoors() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['outdoors', profile?.id, profile?.role, profile?.pdv_id],
    queryFn: async (): Promise<Outdoor[]> => {
      let query = supabase
        .from('outdoors')
        .select(`
          *,
          pdvs(name)
        `)
        .order('code');

      // If user is manager or collaborator with a PDV assigned, filter to only their PDV's outdoors
      if (profile?.pdv_id && ['manager', 'collaborator'].includes(profile?.role || '')) {
        query = query.eq('pdv_id', profile.pdv_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data as OutdoorWithPDV[]).map(out => ({
        id: out.id,
        pdvId: out.pdv_id,
        pdvName: out.pdvs?.name || 'PDV não encontrado',
        code: out.code,
        location: out.location,
        width: Number(out.width),
        height: Number(out.height),
        area: out.area ? Number(out.area) : Number(out.width) * Number(out.height),
        photoUrl: out.photo_url || undefined,
        contractId: out.contract_id || undefined,
        status: out.status as OutdoorStatus,
        lastEvaluation: out.last_evaluation || undefined,
        nonOperationalReason: out.non_operational_reason || undefined,
        lat: out.lat ? Number(out.lat) : null,
        lng: out.lng ? Number(out.lng) : null,
        validationRadiusMeters: out.validation_radius_meters || 50,
      }));
    },
    enabled: !!profile,
  });
}

interface PhotoData {
  url: string;
  timestamp: number;
}

interface CreateMediaEvaluationInput {
  outdoorId: string;
  pdvId: string;
  status: OutdoorStatus;
  nonOperationalReason?: string;
  photos: PhotoData[];
  measuresConfirmed: boolean;
  observations?: string;
}

export function useCreateMediaEvaluation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMediaEvaluationInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Create evaluation
      const { data: evaluation, error: evalError } = await supabase
        .from('media_evaluations')
        .insert({
          outdoor_id: input.outdoorId,
          pdv_id: input.pdvId,
          evaluator_id: user.id,
          status: input.status,
          non_operational_reason: input.nonOperationalReason || null,
          measures_confirmed: input.measuresConfirmed,
          observations: input.observations || null,
          month_year: monthYear,
        })
        .select()
        .single();

      if (evalError) throw evalError;

      // Add photos
      if (input.photos.length > 0) {
        const photoInserts = input.photos.map(photo => ({
          evaluation_id: evaluation.id,
          photo_url: photo.url,
        }));

        const { error: photoError } = await supabase
          .from('media_evaluation_photos')
          .insert(photoInserts);

        if (photoError) throw photoError;
      }

      // Update outdoor status using RPC (bypasses RLS for managers)
      const { error: outdoorError } = await supabase.rpc('update_outdoor_after_evaluation', {
        p_outdoor_id: input.outdoorId,
        p_status: input.status,
        p_non_operational_reason: input.nonOperationalReason || null,
      });

      if (outdoorError) throw outdoorError;

      // Send notification to super_admin and admin
      const statusLabel = input.status === 'operational' ? 'Operacional' : 'Não Operacional';
      try {
        await notificarPorRole(
          'super_admin',
          'media_evaluation',
          'media',
          'Nova Avaliação de Outdoor',
          `Outdoor avaliado como ${statusLabel}`,
          `/outdoor/${input.outdoorId}`,
          evaluation.id,
          'media_evaluation'
        );
        await notificarPorRole(
          'admin',
          'media_evaluation',
          'media',
          'Nova Avaliação de Outdoor',
          `Outdoor avaliado como ${statusLabel}`,
          `/outdoor/${input.outdoorId}`,
          evaluation.id,
          'media_evaluation'
        );
      } catch (notifError) {
        console.warn('Erro ao enviar notificação:', notifError);
      }

      return evaluation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      queryClient.invalidateQueries({ queryKey: ['media-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['media-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pdvs-with-stats'] });
    },
  });
}
