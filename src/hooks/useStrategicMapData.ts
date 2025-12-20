import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, isBefore, parseISO } from 'date-fns';

export interface MapPDV {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  status: string;
  type: 'posto' | 'conveniencia' | 'both';
  manager_id: string | null;
  managerName: string | null;
  lastEvaluationDate: string | null;
  lastScore: number | null;
  evaluationStatus: 'ok' | 'pending' | 'critical';
  outdoorCount: number;
  status_importacao: string | null;
}

export interface MapOutdoor {
  id: string;
  code: string;
  location: string;
  lat: number | null;
  lng: number | null;
  width: number;
  height: number;
  status: 'operational' | 'non_operational' | 'pending_evaluation';
  photo_url: string | null;
  pdv_id: string;
  pdvName: string;
  contractEndDate: string | null;
  daysUntilContractEnd: number | null;
  lastEvaluation: string | null;
  daysSinceEvaluation: number | null;
}

export interface MapKPIs {
  totalPDVs: number;
  pdvsWithPendingEvaluation: number;
  pdvsCritical: number;
  totalOutdoors: number;
  operationalOutdoors: number;
  nonOperationalOutdoors: number;
  pendingEvaluationOutdoors: number;
  contractsExpiringSoon: number;
  outdoorsInactiveLong: number;
}

export function useMapboxToken() {
  return useQuery({
    queryKey: ['mapbox-token'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-mapbox-token');
      if (error) throw error;
      return data.token as string;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useMapPDVs() {
  return useQuery({
    queryKey: ['map-pdvs'],
    queryFn: async () => {
      // Get PDVs with manager info
      const { data: pdvs, error: pdvError } = await supabase
        .from('pdvs')
        .select(`
          id,
          code,
          name,
          address,
          city,
          state,
          lat,
          lng,
          status,
          type,
          manager_id,
          status_importacao,
          manager:profiles!pdvs_manager_id_fkey(name)
        `);

      if (pdvError) throw pdvError;

      // Get latest evaluations
      const { data: evaluations, error: evalError } = await supabase
        .from('merch_evaluations')
        .select('pdv_id, percentage_score, evaluation_date')
        .eq('status', 'completed')
        .order('evaluation_date', { ascending: false });

      if (evalError) throw evalError;

      // Get outdoor counts per PDV
      const { data: outdoors, error: outError } = await supabase
        .from('outdoors')
        .select('pdv_id');

      if (outError) throw outError;

      // Build maps
      const evalMap = new Map<string, { score: number; date: string }>();
      evaluations?.forEach(e => {
        if (!evalMap.has(e.pdv_id)) {
          evalMap.set(e.pdv_id, { score: e.percentage_score, date: e.evaluation_date });
        }
      });

      const outdoorCountMap = new Map<string, number>();
      outdoors?.forEach(o => {
        outdoorCountMap.set(o.pdv_id, (outdoorCountMap.get(o.pdv_id) || 0) + 1);
      });

      const today = new Date();
      const fortyFiveDaysAgo = subDays(today, 45);

      const mapPDVs: MapPDV[] = pdvs?.map(pdv => {
        const evalData = evalMap.get(pdv.id);
        const lastDate = evalData?.date ? parseISO(evalData.date) : null;
        
        let evaluationStatus: 'ok' | 'pending' | 'critical' = 'ok';
        if (!lastDate) {
          evaluationStatus = 'pending';
        } else if (isBefore(lastDate, fortyFiveDaysAgo)) {
          evaluationStatus = 'pending';
        }
        if (evalData?.score && evalData.score < 60) {
          evaluationStatus = 'critical';
        }

        return {
          id: pdv.id,
          code: pdv.code,
          name: pdv.name,
          address: pdv.address,
          city: pdv.city,
          state: pdv.state,
          lat: pdv.lat,
          lng: pdv.lng,
          status: pdv.status,
          type: (pdv.type || 'posto') as 'posto' | 'conveniencia' | 'both',
          manager_id: pdv.manager_id,
          managerName: pdv.manager?.name || null,
          lastEvaluationDate: evalData?.date || null,
          lastScore: evalData?.score || null,
          evaluationStatus,
          outdoorCount: outdoorCountMap.get(pdv.id) || 0,
          status_importacao: pdv.status_importacao || null,
        };
      }) || [];

      return mapPDVs;
    },
  });
}

export function useMapOutdoors() {
  return useQuery({
    queryKey: ['map-outdoors'],
    queryFn: async () => {
      // Get outdoors with PDV info including PDV coordinates for fallback
      const { data: outdoors, error: outError } = await supabase
        .from('outdoors')
        .select(`
          id,
          code,
          location,
          lat,
          lng,
          width,
          height,
          status,
          photo_url,
          pdv_id,
          last_evaluation,
          pdv:pdvs!outdoors_pdv_id_fkey(name, lat, lng)
        `);

      if (outError) throw outError;

      // Get contracts to check expiration
      const { data: contracts, error: contError } = await supabase
        .from('contracts')
        .select('outdoor_id, end_date, status')
        .eq('status', 'active');

      if (contError) throw contError;

      const contractMap = new Map<string, string>();
      contracts?.forEach(c => {
        contractMap.set(c.outdoor_id, c.end_date);
      });

      const today = new Date();

      const mapOutdoors: MapOutdoor[] = outdoors?.map(outdoor => {
        const contractEnd = contractMap.get(outdoor.id);
        let daysUntilContractEnd: number | null = null;
        if (contractEnd) {
          const endDate = parseISO(contractEnd);
          daysUntilContractEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        let daysSinceEvaluation: number | null = null;
        if (outdoor.last_evaluation) {
          const lastEvalDate = parseISO(outdoor.last_evaluation);
          daysSinceEvaluation = Math.ceil((today.getTime() - lastEvalDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Use outdoor coordinates, or fallback to PDV coordinates if outdoor has none
        const finalLat = outdoor.lat ?? outdoor.pdv?.lat ?? null;
        const finalLng = outdoor.lng ?? outdoor.pdv?.lng ?? null;

        return {
          id: outdoor.id,
          code: outdoor.code,
          location: outdoor.location,
          lat: finalLat,
          lng: finalLng,
          width: outdoor.width,
          height: outdoor.height,
          status: outdoor.status as 'operational' | 'non_operational' | 'pending_evaluation',
          photo_url: outdoor.photo_url,
          pdv_id: outdoor.pdv_id,
          pdvName: outdoor.pdv?.name || '',
          contractEndDate: contractEnd || null,
          daysUntilContractEnd,
          lastEvaluation: outdoor.last_evaluation,
          daysSinceEvaluation,
        };
      }) || [];

      return mapOutdoors;
    },
  });
}

export function useMapKPIs() {
  const { data: pdvs } = useMapPDVs();
  const { data: outdoors } = useMapOutdoors();

  const kpis: MapKPIs = {
    totalPDVs: pdvs?.length || 0,
    pdvsWithPendingEvaluation: pdvs?.filter(p => p.evaluationStatus === 'pending').length || 0,
    pdvsCritical: pdvs?.filter(p => p.evaluationStatus === 'critical').length || 0,
    totalOutdoors: outdoors?.length || 0,
    operationalOutdoors: outdoors?.filter(o => o.status === 'operational').length || 0,
    nonOperationalOutdoors: outdoors?.filter(o => o.status === 'non_operational').length || 0,
    pendingEvaluationOutdoors: outdoors?.filter(o => o.status === 'pending_evaluation').length || 0,
    contractsExpiringSoon: outdoors?.filter(o => o.daysUntilContractEnd !== null && o.daysUntilContractEnd <= 30 && o.daysUntilContractEnd > 0).length || 0,
    outdoorsInactiveLong: outdoors?.filter(o => o.daysSinceEvaluation !== null && o.daysSinceEvaluation > 15).length || 0,
  };

  return kpis;
}
