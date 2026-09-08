import { useNavigate } from 'react-router-dom';
import { formatDateRange } from 'little-date';
import { 
  AlertTriangle, 
  FileText, 
  Wrench, 
  Clock,
  ChevronRight,
  CalendarX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarEvent, CalendarEventType, CalendarEventSeverity } from '@/hooks/useCalendarEvents';
import { useModule } from '@/contexts/ModuleContext';

interface CalendarEventsListProps {
  events: CalendarEvent[];
}

const eventTypeIcons: Record<CalendarEventType, React.ElementType> = {
  avaliacao_expirando: Clock,
  contrato_vencendo: FileText,
  prazo_fornecedor: Wrench,
  manutencao_pendente: AlertTriangle,
};

const eventTypeLabels: Record<CalendarEventType, string> = {
  avaliacao_expirando: 'Avaliação',
  contrato_vencendo: 'Contrato',
  prazo_fornecedor: 'Fornecedor',
  manutencao_pendente: 'Manutenção',
};

const severityStyles: Record<CalendarEventSeverity, string> = {
  critical: 'border-l-destructive bg-destructive/5',
  warning: 'border-l-orange-500 bg-orange-500/5',
  info: 'border-l-primary bg-primary/5',
};

const severityBadgeStyles: Record<CalendarEventSeverity, string> = {
  critical: 'bg-destructive/10 text-destructive',
  warning: 'bg-orange-500/10 text-orange-600',
  info: 'bg-primary/10 text-primary',
};

export function CalendarEventsList({ events }: CalendarEventsListProps) {
  const navigate = useNavigate();
  const { setActiveModule } = useModule();

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CalendarX className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhum evento nesta data</p>
      </div>
    );
  }

  const handleEventClick = (event: CalendarEvent) => {
    if (event.metadata.navigateTo) {
      // Definir módulo ativo baseado no tipo de evento
      if (
        event.type === 'avaliacao_expirando' || 
        event.type === 'contrato_vencendo' || 
        event.type === 'prazo_fornecedor' || 
        event.type === 'manutencao_pendente'
      ) {
        setActiveModule('media');
      }
      navigate(event.metadata.navigateTo);
    }
  };

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const Icon = eventTypeIcons[event.type];
        
        return (
          <button
            key={event.id}
            onClick={() => handleEventClick(event)}
            className={cn(
              "w-full text-left p-3 rounded-lg border-l-4 transition-all hover:shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring/50",
              severityStyles[event.severity]
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-1.5 rounded-md",
                severityBadgeStyles[event.severity]
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {event.title}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {event.description}
                </p>
                <span className={cn(
                  "inline-block text-xs px-1.5 py-0.5 rounded mt-1.5",
                  severityBadgeStyles[event.severity]
                )}>
                  {eventTypeLabels[event.type]}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
