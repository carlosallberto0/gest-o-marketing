import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, isAfter, isBefore, isToday, startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth } from 'date-fns';

export type CalendarEventType = 
  | 'avaliacao_expirando' 
  | 'contrato_vencendo' 
  | 'prazo_fornecedor' 
  | 'manutencao_pendente';

export type CalendarEventSeverity = 'info' | 'warning' | 'critical';

export interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  type: CalendarEventType;
  severity: CalendarEventSeverity;
  metadata: {
    outdoorId?: string;
    outdoorCode?: string;
    pdvName?: string;
    contractId?: string;
    maintenanceId?: string;
    supplierId?: string;
    supplierName?: string;
    farmerName?: string;
    navigateTo?: string;
    [key: string]: string | undefined;
  };
}

function getSeverityFromDays(daysUntil: number, thresholds: { critical: number; warning: number }): CalendarEventSeverity {
  if (daysUntil <= thresholds.critical) return 'critical';
  if (daysUntil <= thresholds.warning) return 'warning';
  return 'info';
}

export function useCalendarEvents(selectedMonth?: Date) {
  return useQuery({
    queryKey: ['calendar-events', selectedMonth?.toISOString()],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const events: CalendarEvent[] = [];
      const today = new Date();
      
      // Define date range for queries (current month +/- 1 month for buffer)
      const rangeStart = selectedMonth 
        ? startOfMonth(addDays(selectedMonth, -30)) 
        : addDays(today, -7);
      const rangeEnd = selectedMonth 
        ? endOfMonth(addDays(selectedMonth, 30)) 
        : addDays(today, 60);

      // 1. Fetch outdoors with expiring evaluations
      const { data: outdoors } = await supabase
        .from('outdoors')
        .select(`
          id,
          code,
          avaliacao_valida_ate,
          pdv:pdvs(name)
        `)
        .not('avaliacao_valida_ate', 'is', null)
        .gte('avaliacao_valida_ate', rangeStart.toISOString())
        .lte('avaliacao_valida_ate', rangeEnd.toISOString());

      if (outdoors) {
        outdoors.forEach(outdoor => {
          if (!outdoor.avaliacao_valida_ate) return;
          
          const expirationDate = parseISO(outdoor.avaliacao_valida_ate);
          const daysUntil = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          events.push({
            id: `outdoor-eval-${outdoor.id}`,
            date: startOfDay(expirationDate),
            title: `Avaliação expira: ${outdoor.code}`,
            description: `PDV: ${(outdoor.pdv as any)?.name || 'N/A'}`,
            type: 'avaliacao_expirando',
            severity: getSeverityFromDays(daysUntil, { critical: 0, warning: 3 }),
            metadata: {
              outdoorId: outdoor.id,
              outdoorCode: outdoor.code,
              pdvName: (outdoor.pdv as any)?.name,
              navigateTo: `/media/outdoors/${outdoor.id}`,
            },
          });
        });
      }

      // 2. Fetch contracts expiring soon
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id,
          farmer_name,
          end_date,
          outdoor:outdoors(id, code)
        `)
        .eq('status', 'active')
        .gte('end_date', rangeStart.toISOString())
        .lte('end_date', rangeEnd.toISOString());

      if (contracts) {
        contracts.forEach(contract => {
          const endDate = parseISO(contract.end_date);
          const daysUntil = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          events.push({
            id: `contract-${contract.id}`,
            date: startOfDay(endDate),
            title: `Contrato vence: ${contract.farmer_name}`,
            description: `Outdoor: ${(contract.outdoor as any)?.code || 'N/A'}`,
            type: 'contrato_vencendo',
            severity: getSeverityFromDays(daysUntil, { critical: 7, warning: 30 }),
            metadata: {
              contractId: contract.id,
              farmerName: contract.farmer_name,
              outdoorId: (contract.outdoor as any)?.id,
              outdoorCode: (contract.outdoor as any)?.code,
              navigateTo: '/media/contracts',
            },
          });
        });
      }

      // 3. Fetch supplier deadlines
      const { data: assignments } = await supabase
        .from('supplier_maintenance_assignments')
        .select(`
          id,
          deadline_date,
          status,
          supplier:suppliers(id, name),
          maintenance_request:maintenance_requests(
            id,
            outdoor:outdoors(id, code)
          )
        `)
        .not('deadline_date', 'is', null)
        .in('status', ['assigned', 'in_progress', 'quoted'])
        .gte('deadline_date', rangeStart.toISOString())
        .lte('deadline_date', rangeEnd.toISOString());

      if (assignments) {
        assignments.forEach(assignment => {
          if (!assignment.deadline_date) return;
          
          const deadlineDate = parseISO(assignment.deadline_date);
          const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const maintenanceRequest = assignment.maintenance_request as any;
          const supplier = assignment.supplier as any;
          
          events.push({
            id: `supplier-deadline-${assignment.id}`,
            date: startOfDay(deadlineDate),
            title: `Prazo fornecedor: ${supplier?.name || 'N/A'}`,
            description: `Outdoor: ${maintenanceRequest?.outdoor?.code || 'N/A'}`,
            type: 'prazo_fornecedor',
            severity: getSeverityFromDays(daysUntil, { critical: 0, warning: 3 }),
            metadata: {
              maintenanceId: maintenanceRequest?.id,
              supplierId: supplier?.id,
              supplierName: supplier?.name,
              outdoorId: maintenanceRequest?.outdoor?.id,
              outdoorCode: maintenanceRequest?.outdoor?.code,
              navigateTo: '/supplier-management',
            },
          });
        });
      }

      // 4. Fetch pending maintenance requests (grouped by creation date)
      const { data: maintenanceRequests } = await supabase
        .from('maintenance_requests')
        .select(`
          id,
          created_at,
          reason,
          urgency,
          outdoor:outdoors(id, code, pdv:pdvs(name))
        `)
        .eq('status', 'pending')
        .gte('created_at', addDays(today, -30).toISOString());

      if (maintenanceRequests) {
        maintenanceRequests.forEach(request => {
          const createdDate = parseISO(request.created_at);
          const daysPending = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          const outdoor = request.outdoor as any;
          
          // Severity based on how long it's been pending
          let severity: CalendarEventSeverity = 'info';
          if (daysPending >= 7) severity = 'critical';
          else if (daysPending >= 3) severity = 'warning';
          
          events.push({
            id: `maintenance-${request.id}`,
            date: startOfDay(createdDate),
            title: `Manutenção pendente: ${outdoor?.code || 'N/A'}`,
            description: request.reason.substring(0, 50) + (request.reason.length > 50 ? '...' : ''),
            type: 'manutencao_pendente',
            severity,
            metadata: {
              maintenanceId: request.id,
              outdoorId: outdoor?.id,
              outdoorCode: outdoor?.code,
              pdvName: outdoor?.pdv?.name,
              navigateTo: '/supplier-management',
            },
          });
        });
      }

      return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  return events.filter(event => {
    const eventDate = startOfDay(event.date);
    return eventDate >= dayStart && eventDate <= dayEnd;
  });
}

export function getDatesWithEvents(events: CalendarEvent[]): Map<string, CalendarEventSeverity> {
  const dateMap = new Map<string, CalendarEventSeverity>();
  
  events.forEach(event => {
    const dateKey = startOfDay(event.date).toISOString();
    const currentSeverity = dateMap.get(dateKey);
    
    // Keep the highest severity for each date
    if (!currentSeverity || 
        (event.severity === 'critical') ||
        (event.severity === 'warning' && currentSeverity === 'info')) {
      dateMap.set(dateKey, event.severity);
    }
  });
  
  return dateMap;
}
