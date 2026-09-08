import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, MessageCircle } from 'lucide-react';
import { PublicPdv, ServicoOption } from '@/hooks/usePublicNetwork';
import { showToast } from '@/lib/toast';

interface Props {
  open: boolean;
  onClose: () => void;
  pdvs: PublicPdv[];
  servicos: ServicoOption[];
}

export function ShareDialog({ open, onClose, pdvs, servicos }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const labelByKey = new Map(servicos.map((s) => [s.key, s.label]));

  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const selectAll = (all: boolean) => {
    setSelected(all ? new Set(pdvs.map((p) => p.id)) : new Set());
  };

  const generate = () => {
    const chosen = pdvs.filter((p) => selected.has(p.id));
    if (chosen.length === 0) {
      showToast.error('Selecione ao menos um posto.');
      return;
    }
    const lines = chosen.map((p) => {
      const svc = p.servicos.map((k) => labelByKey.get(k) || k).join(', ');
      return [
        `📍 ${p.name}${p.bandeira ? ` (${p.bandeira})` : ''}`,
        `${p.address}, ${p.city} - ${p.state}`,
        p.phone ? `📞 ${p.phone}` : null,
        svc ? `Serviços: ${svc}` : null,
      ].filter(Boolean).join('\n');
    });
    setText(`Rede de Postos:\n\n${lines.join('\n\n')}`);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    showToast.success('Texto copiado!');
  };

  const wa = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Compartilhar Postos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => selectAll(true)}>Todos</Button>
            <Button variant="outline" size="sm" onClick={() => selectAll(false)}>Nenhum</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-border rounded-md">
            {pdvs.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                <span className="truncate">{p.name}</span>
              </label>
            ))}
          </div>
          {text && (
            <Textarea value={text} readOnly className="h-40 font-mono text-xs" />
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button onClick={generate}>Gerar texto</Button>
            {text && (
              <>
                <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-2" />Copiar</Button>
                <Button variant="outline" onClick={wa}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
