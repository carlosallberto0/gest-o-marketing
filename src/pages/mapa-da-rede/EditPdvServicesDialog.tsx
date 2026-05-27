import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSetPdvServices, useUpdatePdvNetworkFields } from '@/hooks/usePdvServices';
import { PublicPdv, ServicoOption } from '@/hooks/usePublicNetwork';

interface Props {
  open: boolean;
  pdv: PublicPdv | null;
  servicos: ServicoOption[];
  onClose: () => void;
}

export function EditPdvServicesDialog({ open, pdv, servicos, onClose }: Props) {
  const [bandeira, setBandeira] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const setServices = useSetPdvServices();
  const updateFields = useUpdatePdvNetworkFields();

  // sync state when opening
  useState(() => {
    if (pdv) {
      setBandeira(pdv.bandeira || '');
      setCnpj(pdv.cnpj || '');
      setPhone(pdv.phone || '');
      setKeys(new Set(pdv.servicos));
    }
  });

  const handleOpenChange = (o: boolean) => {
    if (!o) onClose();
  };

  // reset on pdv change
  if (pdv && !open) return null;

  const toggle = (k: string) => {
    const n = new Set(keys);
    n.has(k) ? n.delete(k) : n.add(k);
    setKeys(n);
  };

  const save = async () => {
    if (!pdv) return;
    await updateFields.mutateAsync({
      pdvId: pdv.id,
      bandeira: bandeira || null,
      cnpj: cnpj || null,
      phone: phone || null,
    });
    await setServices.mutateAsync({ pdvId: pdv.id, servicoKeys: Array.from(keys) });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{pdv?.name || 'Posto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Bandeira</Label>
              <Input value={bandeira} onChange={(e) => setBandeira(e.target.value)} placeholder="Shell, BR, Ipiranga..." />
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Serviços oferecidos</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {servicos.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={keys.has(s.key)} onCheckedChange={() => toggle(s.key)} />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={setServices.isPending || updateFields.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
