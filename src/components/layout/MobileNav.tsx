import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useVisibleNavGroups } from "@/hooks/useVisibleNavGroups";
import { useMeuPerfil } from "@/hooks/useMeuPerfil";
import { NavGroupList } from "@/components/layout/NavGroupList";
import { NotificacoesSino } from "@/components/layout/NotificacoesSino";
import { iniciais } from "@/components/layout/AppHeader";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const groups = useVisibleNavGroups();
  const { data: perfil, isError: perfilComErro } = useMeuPerfil();

  return (
    <div className="flex items-center justify-between border-b border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:hidden">
      <p className="text-lg font-semibold">Marketing OS</p>
      <div className="flex items-center gap-1">
        <NotificacoesSino />
        <Avatar
          className="h-8 w-8"
          role="img"
          aria-label={perfilComErro ? "Erro ao carregar perfil" : (perfil?.nome ?? "Perfil")}
        >
          <AvatarFallback>{perfilComErro ? "?" : iniciais(perfil?.nome)}</AvatarFallback>
        </Avatar>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-72 flex-col gap-6 overflow-y-auto bg-sidebar text-sidebar-foreground"
          >
            <SheetHeader>
              <SheetTitle className="text-left text-sidebar-foreground">Marketing OS</SheetTitle>
            </SheetHeader>
            <nav aria-label="Navegação principal" className="flex flex-1 flex-col">
              <NavGroupList groups={groups} onNavigate={() => setOpen(false)} />
            </nav>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sair
            </Button>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
