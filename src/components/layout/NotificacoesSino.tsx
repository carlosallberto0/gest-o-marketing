import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMinhasNotificacoes, useMarcarNotificacaoLida } from "@/hooks/useNotificacoes";

// Sino de notificações — compartilhado entre AppHeader (desktop, hidden no
// mobile) e MobileNav (mobile), pra não duplicar o Popover nem os hooks
// entre os dois shells.
export function NotificacoesSino() {
  const {
    data: notificacoes,
    isError: notificacoesComErro,
    error: notificacoesErro,
    refetch: refetchNotificacoes,
  } = useMinhasNotificacoes();
  const marcarLida = useMarcarNotificacaoLida();
  const naoLidas = (notificacoes ?? []).filter((n) => !n.lida).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {naoLidas > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-semibold text-foreground">Notificações</p>
        {notificacoesComErro ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-sm text-destructive">
              {notificacoesErro instanceof Error
                ? notificacoesErro.message
                : "Não foi possível carregar as notificações."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchNotificacoes()}>
              Tentar novamente
            </Button>
          </div>
        ) : (notificacoes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {notificacoes!.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  disabled={marcarLida.isPending}
                  onClick={() => !n.lida && !marcarLida.isPending && marcarLida.mutate(n.id)}
                  className={`w-full rounded-md p-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${n.lida ? "text-muted-foreground" : "bg-accent font-medium text-accent-foreground"}`}
                >
                  <p>{n.titulo}</p>
                  <p className="text-xs">{n.mensagem}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
