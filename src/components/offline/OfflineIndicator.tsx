import { Wifi, WifiOff, CloudOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    syncPendingChecklists,
    retryFailedSyncs,
    pendingChecklists 
  } = useOfflineStorage();

  const hasErrors = pendingChecklists.some(c => c.syncStatus === 'error');

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative",
            !isOnline && "text-warning",
            hasErrors && "text-destructive"
          )}
        >
          {isOnline ? (
            isSyncing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CloudOff className="h-5 w-5" />
            )
          ) : (
            <WifiOff className="h-5 w-5" />
          )}
          {pendingCount > 0 && (
            <Badge 
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px]",
                hasErrors ? "bg-destructive" : "bg-warning"
              )}
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-success" />
            ) : (
              <WifiOff className="h-5 w-5 text-warning" />
            )}
            <div>
              <p className="font-medium text-sm">
                {isOnline ? 'Conectado' : 'Offline'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline 
                  ? 'Você está conectado à internet'
                  : 'Dados serão salvos localmente'}
              </p>
            </div>
          </div>

          {pendingCount > 0 && (
            <>
              <div className="border-t border-border pt-3">
                <p className="text-sm font-medium">
                  {pendingCount} checklist(s) pendente(s)
                </p>
                <ul className="mt-2 space-y-1">
                  {pendingChecklists.slice(0, 3).map((checklist) => (
                    <li 
                      key={checklist.id}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        checklist.syncStatus === 'pending' && "bg-warning",
                        checklist.syncStatus === 'syncing' && "bg-primary animate-pulse",
                        checklist.syncStatus === 'error' && "bg-destructive"
                      )} />
                      <span className="truncate">
                        {new Date(checklist.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="ml-auto capitalize">
                        {checklist.syncStatus === 'pending' && 'Pendente'}
                        {checklist.syncStatus === 'syncing' && 'Sincronizando...'}
                        {checklist.syncStatus === 'error' && 'Erro'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                {isOnline && (
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={syncPendingChecklists}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar
                  </Button>
                )}
                {hasErrors && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={retryFailedSyncs}
                    disabled={isSyncing}
                  >
                    Tentar novamente
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}