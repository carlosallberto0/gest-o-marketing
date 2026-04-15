import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface Route {
  id: string;
  name: string;
  type: 'auto' | 'manual' | 'unified';
  package_id: string | null;
  supplier_id: string | null;
  origin_lat: number;
  origin_lng: number;
  origin_label: string;
  total_distance_km: number;
  estimated_days: number;
  deadline: string | null;
  production_days: number;
  status: 'draft' | 'active' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
  supplier?: { name: string } | null;
  points?: RoutePoint[];
}

export interface RoutePoint {
  id: string;
  route_id: string;
  outdoor_id: string;
  sequence: number;
  scheduled_date: string | null;
  priority: string;
  estimated_arrival_order: number | null;
  notes: string | null;
  created_at: string;
  outdoor?: {
    id: string;
    code: string;
    location: string;
    lat: number | null;
    lng: number | null;
    photo_url: string | null;
    status: string;
    pdv?: { name: string; city: string; state: string };
  };
}

export function useRoutes(status?: string) {
  return useQuery({
    queryKey: ['routes', status],
    queryFn: async (): Promise<Route[]> => {
      let query = supabase
        .from('routes')
        .select(`
          *,
          supplier:supplier_id(name)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Route[];
    },
  });
}

export function useRouteDetails(routeId: string | undefined) {
  return useQuery({
    queryKey: ['route', routeId],
    queryFn: async (): Promise<Route | null> => {
      if (!routeId) return null;

      const { data: route, error: routeError } = await supabase
        .from('routes')
        .select(`*, supplier:supplier_id(name)`)
        .eq('id', routeId)
        .single();

      if (routeError) throw routeError;

      const { data: points, error: pointsError } = await supabase
        .from('route_points')
        .select(`
          *,
          outdoor:outdoor_id(
            id, code, location, lat, lng, photo_url, status,
            pdv:pdv_id(name, city, state)
          )
        `)
        .eq('route_id', routeId)
        .order('sequence', { ascending: true });

      if (pointsError) throw pointsError;

      return {
        ...route,
        points: points || [],
      } as unknown as Route;
    },
    enabled: !!routeId,
  });
}

export function useSupplierRoutes() {
  return useQuery({
    queryKey: ['supplier-routes'],
    queryFn: async (): Promise<Route[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', user.id)
        .single();

      if (!profile?.supplier_id) return [];

      const { data: routes, error } = await supabase
        .from('routes')
        .select(`*, supplier:supplier_id(name)`)
        .eq('supplier_id', profile.supplier_id)
        .in('status', ['active', 'draft'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch points for each route
      const result: Route[] = [];
      for (const route of (routes || [])) {
        const { data: points } = await supabase
          .from('route_points')
          .select(`
            *,
            outdoor:outdoor_id(
              id, code, location, lat, lng, photo_url, status,
              pdv:pdv_id(name, city, state)
            )
          `)
          .eq('route_id', route.id)
          .order('sequence', { ascending: true });

        result.push({
          ...route,
          points: (points || []),
        } as unknown as Route);
      }

      return result;
    },
  });
}

interface CreateAutoRouteInput {
  packageId: string;
  supplierId?: string;
  name?: string;
}

export function useCreateAutoRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAutoRouteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Try work order items first, fallback to package items
      let outdoorIds: string[] = [];
      
      // Check supplier_work_order_items for this package
      const { data: woData } = await supabase
        .from('supplier_work_orders')
        .select('id')
        .eq('package_id', input.packageId)
        .in('status', ['pending', 'in_progress']);

      if (woData && woData.length > 0) {
        const woIds = woData.map((wo: any) => wo.id);
        const { data: woItems } = await supabase
          .from('supplier_work_order_items')
          .select('outdoor_id')
          .in('work_order_id', woIds);
        outdoorIds = (woItems || []).map((i: any) => i.outdoor_id);
      }

      // Fallback to package items if no work order items
      if (outdoorIds.length === 0) {
        const { data: items, error: itemsError } = await supabase
          .from('maintenance_package_items')
          .select('outdoor_id')
          .eq('package_id', input.packageId)
          .eq('status', 'approved');
        if (itemsError) throw itemsError;
        outdoorIds = (items || []).map(i => i.outdoor_id);
      }

      if (outdoorIds.length === 0) throw new Error('Nenhum outdoor encontrado na OS/pacote');

      // Call optimization edge function
      const { data: optimized, error: optError } = await supabase.functions.invoke('optimize-route', {
        body: {
          outdoor_ids: outdoorIds,
          approval_date: new Date().toISOString().split('T')[0],
        },
      });

      if (optError) throw optError;
      if (!optimized?.success) throw new Error(optimized?.error || 'Erro na otimização');

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 15);

      // Create route
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert({
          name: input.name || `Rota Pacote ${new Date().toLocaleDateString('pt-BR')}`,
          type: 'auto',
          package_id: input.packageId,
          supplier_id: input.supplierId || null,
          total_distance_km: optimized.data.total_distance_km,
          estimated_days: optimized.data.estimated_days,
          deadline: deadline.toISOString().split('T')[0],
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (routeError) throw routeError;

      // Insert points
      const pointsToInsert = optimized.data.points.map((p: any) => ({
        route_id: route.id,
        outdoor_id: p.outdoor_id,
        sequence: p.sequence,
        scheduled_date: p.scheduled_date,
        priority: p.priority,
        estimated_arrival_order: p.sequence,
      }));

      const { error: pointsError } = await supabase
        .from('route_points')
        .insert(pointsToInsert);

      if (pointsError) throw pointsError;

      // Log history
      await supabase.from('route_history').insert({
        route_id: route.id,
        action: 'created',
        user_id: user.id,
        details: { type: 'auto', package_id: input.packageId, outdoor_count: outdoorIds.length },
      });

      return route;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      showToast.success('Rota automática gerada com sucesso');
    },
    onError: (error: Error) => {
      showToast.error('Erro ao gerar rota', error.message);
    },
  });
}

interface CreateManualRouteInput {
  name: string;
  outdoorIds: string[];
  supplierId?: string;
}

export function useCreateManualRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateManualRouteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Optimize the order
      const { data: optimized, error: optError } = await supabase.functions.invoke('optimize-route', {
        body: {
          outdoor_ids: input.outdoorIds,
          approval_date: new Date().toISOString().split('T')[0],
        },
      });

      if (optError) throw optError;

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 15);

      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert({
          name: input.name,
          type: 'manual',
          supplier_id: input.supplierId || null,
          total_distance_km: optimized?.data?.total_distance_km || 0,
          estimated_days: 15,
          deadline: deadline.toISOString().split('T')[0],
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (routeError) throw routeError;

      const points = (optimized?.data?.points || input.outdoorIds.map((id: string, idx: number) => ({
        outdoor_id: id,
        sequence: idx + 1,
        priority: 'pending',
      }))).map((p: any) => ({
        route_id: route.id,
        outdoor_id: p.outdoor_id,
        sequence: p.sequence,
        scheduled_date: p.scheduled_date || null,
        priority: p.priority || 'pending',
        estimated_arrival_order: p.sequence,
      }));

      await supabase.from('route_points').insert(points);

      await supabase.from('route_history').insert({
        route_id: route.id,
        action: 'created',
        user_id: user.id,
        details: { type: 'manual', outdoor_count: input.outdoorIds.length },
      });

      return route;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      showToast.success('Rota manual criada com sucesso');
    },
    onError: (error: Error) => {
      showToast.error('Erro ao criar rota', error.message);
    },
  });
}

export function useUnifyRoutes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routeIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Get all points from selected routes
      const { data: allPoints, error } = await supabase
        .from('route_points')
        .select('outdoor_id')
        .in('route_id', routeIds);

      if (error) throw error;

      const outdoorIds = [...new Set((allPoints || []).map(p => p.outdoor_id))];

      // Optimize combined
      const { data: optimized } = await supabase.functions.invoke('optimize-route', {
        body: {
          outdoor_ids: outdoorIds,
          approval_date: new Date().toISOString().split('T')[0],
        },
      });

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 15);

      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert({
          name: `Rota Unificada ${new Date().toLocaleDateString('pt-BR')}`,
          type: 'unified',
          total_distance_km: optimized?.data?.total_distance_km || 0,
          estimated_days: 15,
          deadline: deadline.toISOString().split('T')[0],
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (routeError) throw routeError;

      const points = (optimized?.data?.points || []).map((p: any) => ({
        route_id: route.id,
        outdoor_id: p.outdoor_id,
        sequence: p.sequence,
        scheduled_date: p.scheduled_date || null,
        priority: p.priority || 'pending',
        estimated_arrival_order: p.sequence,
      }));

      await supabase.from('route_points').insert(points);

      // Mark old routes as completed
      for (const rid of routeIds) {
        await supabase.from('routes').update({ status: 'completed' }).eq('id', rid);
      }

      await supabase.from('route_history').insert({
        route_id: route.id,
        action: 'unified',
        user_id: user.id,
        details: { unified_from: routeIds, outdoor_count: outdoorIds.length },
      });

      return route;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      showToast.success('Rotas unificadas com sucesso');
    },
    onError: (error: Error) => {
      showToast.error('Erro ao unificar rotas', error.message);
    },
  });
}

export function useActivateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routeId: string) => {
      const { error } = await supabase
        .from('routes')
        .update({ status: 'active' })
        .eq('id', routeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      showToast.success('Rota ativada');
    },
  });
}

export function useCompleteRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routeId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('routes')
        .update({ status: 'completed' })
        .eq('id', routeId);
      if (error) throw error;

      await supabase.from('route_history').insert({
        route_id: routeId,
        action: 'completed',
        user_id: user?.id,
        details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      showToast.success('Rota concluída');
    },
  });
}
