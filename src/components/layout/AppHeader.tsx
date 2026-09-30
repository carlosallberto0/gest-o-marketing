import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMeuPerfil } from "@/hooks/useMeuPerfil";
import { useMinhasNotificacoes, useMarcarNotificacaoLida } from "@/hooks/useNotificacoes";
import { useBuscaGlobal } from "@/hooks/useBuscaGlobal";

const PAPEL_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  director: "Diretoria",
  manager: "Gerente",
  collaborator: "Colaborador",
  supplier: "Fornecedor",
  coordenador_compras: "Compras",
  convenience_coordinator: "Conveniência",
  approver_executive: "Aprovador executivo",
};

function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export function AppHeader() {
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const navigate = useNavigate();
  const { data: perfil, isError: perfilComErro } = useMeuPerfil();
  const {
    data: notificacoes,
    isError: notificacoesComErro,
    error: notificacoesErro,
    refetch: refetchNotificacoes,
  } = useMinhasNotificacoes();
  const marcarLida = useMarcarNotificacaoLida();
  const grupos = useBuscaGlobal(termo, buscaAberta);
  const naoLidas = (notificacoes ?? []).filter((n) => !n.lida).length;

  function irPara(to: string) {
    navigate(to);
    setBuscaAberta(false);
    setTermo("");
  }

  return (
    <header className="hidden h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:flex md:px-8">
      <Button
        variant="outline"
        className="w-full max-w-sm justify-start gap-2 text-muted-foreground sm:w-64"
        onClick={() => setBuscaAberta(true)}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        Buscar no Marketing OS…
      </Button>

      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{perfilComErro ? "?" : iniciais(perfil?.nome)}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left text-sm leading-tight sm:block">
            <p className={`font-medium ${perfilComErro ? "text-destructive" : "text-foreground"}`}>
              {perfilComErro ? "Erro ao carregar perfil" : (perfil?.nome ?? "…")}
            </p>
            <p className="text-xs text-muted-foreground">
              {!perfilComErro && perfil?.papel ? (PAPEL_LABEL[perfil.papel] ?? perfil.papel) : ""}
            </p>
          </div>
        </div>
      </div>

      <CommandDialog open={buscaAberta} onOpenChange={setBuscaAberta}>
        <CommandInput placeholder="Buscar página, PDV ou campanha…" value={termo} onValueChange={setTermo} />
        <CommandList>
          <CommandEmpty>Nenhum resultado.</CommandEmpty>
          {grupos.map((grupo) => (
            <CommandGroup key={grupo.label} heading={grupo.label}>
              {grupo.itens.map((item) => (
                <CommandItem key={`${grupo.label}-${item.to}-${item.label}`} onSelect={() => irPara(item.to)}>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </header>
  );
}
