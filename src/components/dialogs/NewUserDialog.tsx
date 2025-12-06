import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { usePDVs } from '@/hooks/usePDVs';
import { useCreateUser } from '@/hooks/useCreateUser';

interface NewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roles = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Administrador' },
  { value: 'director', label: 'Diretoria' },
  { value: 'manager', label: 'Gerente' },
  { value: 'collaborator', label: 'Colaborador' },
  { value: 'supplier', label: 'Fornecedor' },
];

export function NewUserDialog({ open, onOpenChange }: NewUserDialogProps) {
  const { data: pdvs } = usePDVs();
  const createUser = useCreateUser();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    role: '' as 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier' | '',
    pdvId: '',
    modules: [] as ('media' | 'merchandising')[],
  });

  const handleModuleChange = (module: 'media' | 'merchandising', checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, modules: [...formData.modules, module] });
    } else {
      setFormData({ ...formData, modules: formData.modules.filter(m => m !== module) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.role || formData.modules.length === 0) {
      return;
    }

    await createUser.mutateAsync({
      name: formData.name,
      email: formData.email,
      cpf: formData.cpf || undefined,
      role: formData.role,
      modules: formData.modules,
      pdvId: formData.pdvId && formData.pdvId !== 'none' ? formData.pdvId : undefined,
    });
    
    onOpenChange(false);
    setFormData({
      name: '',
      email: '',
      cpf: '',
      role: '',
      pdvId: '',
      modules: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do usuário"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Perfil</Label>
              <Select 
                value={formData.role} 
                onValueChange={(v) => setFormData({ ...formData, role: v as typeof formData.role })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdvId">PDV (opcional)</Label>
              <Select value={formData.pdvId} onValueChange={(v) => setFormData({ ...formData, pdvId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {pdvs?.map(pdv => (
                    <SelectItem key={pdv.id} value={pdv.id}>{pdv.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Módulos de Acesso</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="user-module-merchandising" 
                  checked={formData.modules.includes('merchandising')}
                  onCheckedChange={(checked) => handleModuleChange('merchandising', checked as boolean)}
                />
                <Label htmlFor="user-module-merchandising" className="cursor-pointer">Merchandising</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="user-module-media" 
                  checked={formData.modules.includes('media')}
                  onCheckedChange={(checked) => handleModuleChange('media', checked as boolean)}
                />
                <Label htmlFor="user-module-media" className="cursor-pointer">Mídia Externa</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}