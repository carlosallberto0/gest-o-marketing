import { useState } from 'react';
import { Bell, X, Check, AlertTriangle, Info, AlertCircle, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlerts, useMarkAlertAsRead, useMarkAllAlertsAsRead, Alert } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const severityConfig = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950' },
};

const typeConfig: Record<string, { route: string; param: string }> = {
  contract_expiring: { route: '/contracts', param: '' },
  outdoor_pending: { route: '/outdoor-evaluation', param: '' },
  campaign_goal: { route: '/campaigns', param: '' },
  low_score: { route: '/history', param: '' },
};

export function AlertsPopover() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: alerts = [], isLoading } = useAlerts();
  const markAsRead = useMarkAlertAsRead();
  const markAllAsRead = useMarkAllAlertsAsRead();

  const unreadCount = alerts.filter(a => !a.is_read).length;

  const handleAlertClick = (alert: Alert) => {
    if (!alert.is_read) {
      markAsRead.mutate(alert.id);
    }

    const config = typeConfig[alert.type];
    if (config) {
      setOpen(false);
      navigate(config.route);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-foreground">Notificações</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {alerts.map((alert) => {
                const severity = severityConfig[alert.severity];
                const SeverityIcon = severity.icon;

                return (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                      !alert.is_read && severity.bg
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn("mt-0.5", severity.color)}>
                        <SeverityIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium text-foreground",
                            !alert.is_read && "font-semibold"
                          )}>
                            {alert.title}
                          </p>
                          {!alert.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(alert.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}