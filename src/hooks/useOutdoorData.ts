import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Outdoor, OutdoorStatus } from '@/types';
import { useAuth } from '@/hooks/useAuth';

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
  return useQuery({
    queryKey: ['outdoors'],
    queryFn: async (): Promise<Outdoor[]> => {
      const { data, error } = await supabase
        .from('outdoors')
        .select(`
          *,
          pdvs(name)
        `)
        .order('code');

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
  });
}

interface GeoPhotoData {
  url: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isValid: boolean;
  distance: number | null;
}

interface CreateMediaEvaluationInput {
  outdoorId: string;
  pdvId: string;
  status: OutdoorStatus;
  nonOperationalReason?: string;
  photos: GeoPhotoData[];
  measuresConfirmed: boolean;
  observations?: string;
  evaluatorLat?: number;
  evaluatorLng?: number;
}

export function useCreateMediaEvaluation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMediaEvaluationInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const monthYear = new Date().toISOString().slice(0, 7); // YYYY-MM

      // Get first photo's coordinates for the evaluation location
      const firstPhoto = input.photos[0];
      const evalLat = input.evaluatorLat ?? firstPhoto?.latitude ?? null;
      const evalLng = input.evaluatorLng ?? firstPhoto?.longitude ?? null;

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
          lat: evalLat,
          lng: evalLng,
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

        // Add geolocation history for each photo
        const geoInserts = input.photos.map(photo => ({
          outdoor_id: input.outdoorId,
          evaluation_id: evaluation.id,
          latitude: photo.latitude,
          longitude: photo.longitude,
          accuracy: photo.accuracy,
          distance_from_outdoor: photo.distance,
          is_valid: photo.isValid,
          validation_notes: photo.isValid 
            ? `Foto validada. Distância: ${photo.distance?.toFixed(0) || 'N/A'}m`
            : `Foto suspeita. Distância: ${photo.distance?.toFixed(0) || 'N/A'}m`,
          captured_by: user.id,
          photo_url: photo.url,
        }));

        const { error: geoError } = await supabase
          .from('outdoor_geolocation_history')
          .insert(geoInserts);

        if (geoError) {
          console.error('Error saving geolocation history:', geoError);
          // Don't throw, geolocation history is not critical
        }
      }

      // Update outdoor status
      const { error: outdoorError } = await supabase
        .from('outdoors')
        .update({
          status: input.status,
          non_operational_reason: input.status === 'non_operational' ? input.nonOperationalReason : null,
          last_evaluation: new Date().toISOString(),
        })
        .eq('id', input.outdoorId);

      if (outdoorError) throw outdoorError;

      return evaluation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outdoors'] });
      queryClient.invalidateQueries({ queryKey: ['media-evaluations'] });
    },
  });
}
