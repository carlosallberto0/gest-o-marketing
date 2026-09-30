import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descricao: ReactNode;
  rotuloAcao: string;
  rotuloPendente?: string;
  pendente: boolean;
  erro: string | null;
  onConfirm: () => void;
  // default true preserva os usos existentes (todos ações destrutivas de
  // verdade — "Desativar"/"Excluir"); passar false pra confirmação que não
  // descarta dado (ex.: trocar de template com composição em andamento).
  variantePerigosa?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  rotuloAcao,
  rotuloPendente = "Aguarde…",
  pendente,
  erro,
  onConfirm,
  variantePerigosa = true,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: variantePerigosa ? "destructive" : "default" }))}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={pendente}
          >
            {pendente ? rotuloPendente : rotuloAcao}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
