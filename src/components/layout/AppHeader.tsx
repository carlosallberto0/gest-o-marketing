import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getPageInfo } from "@/lib/navigation";
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
  const { pathname } = useLocation();
  const { title, description } = getPageInfo(pathname);
  const grupos = useBuscaGlobal(termo, buscaAberta);

  function irPara(to: string) {
    navigate(to);
    setBuscaAberta(false);
    setTermo("");
  }

  return (
    <header className="hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 md:flex md:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <p className="truncate font-display text-[15px] font-bold leading-none text-foreground">{title}</p>
        {description && (
          <>
            <span className="text-muted-foreground" aria-hidden="true">
              ·
            </span>
            <p className="hidden truncate text-[13px] leading-none text-muted-foreground lg:block">{description}</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Buscar no Marketing OS" onClick={() => setBuscaAberta(true)}>
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>
        <NotificacoesSino />
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
