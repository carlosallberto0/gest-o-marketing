import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useMeuPerfil } from "@/hooks/useMeuPerfil";
import { useBuscaGlobal } from "@/hooks/useBuscaGlobal";
import { NotificacoesSino } from "@/components/layout/NotificacoesSino";

// Exportados para reuso em MobileNav (mesmo mapeamento de papel e mesmas
// iniciais do avatar no shell mobile).
export const PAPEL_LABEL: Record<string, string> = {
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

export function iniciais(nome: string | undefined): string {
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
  const grupos = useBuscaGlobal(termo, buscaAberta);

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
        <NotificacoesSino />

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
