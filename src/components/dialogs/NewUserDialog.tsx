import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Copy, MessageCircle, ExternalLink, Check, Link2, Shield, Key } from 'lucide-react';
import { usePDVs } from '@/hooks/usePDVs';
import { useCreateUser } from '@/hooks/useCreateUser';
import { toast } from 'sonner';

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
  { value: 'coordenador_compras', label: 'Coordenador de Compras' },
  { value: 'convenience_coordinator', label: 'Coordenador de Conveniência' },
];

interface CreatedUserResult {
  role: string;
  accessLink?: string;
  tempPassword?: string;
  userName: string;
}

export function NewUserDialog({ open, onOpenChange }: NewUserDialogProps) {
  const { data: pdvs } = usePDVs();
  const createUser = useCreateUser();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    role: '' as 'super_admin' | 'admin' | 'director' | 'manager' | 'collaborator' | 'supplier' | 'coordenador_compras' | 'convenience_coordinator' | '',
    pdvId: '',
    modules: [] as ('media' | 'merchandising')[],
  });

  const [createdUser, setCreatedUser] = useState<CreatedUserResult | null>(null);
  const [copied, setCopied] = useState(false);

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

    const result = await createUser.mutateAsync({
      name: formData.name,
      email: formData.email,
      cpf: formData.cpf || undefined,
      role: formData.role,
      modules: formData.modules,
      pdvId: formData.pdvId && formData.pdvId !== 'none' ? formData.pdvId : undefined,
    });
    
    // Show the result dialog instead of closing
    setCreatedUser({
      role: formData.role,
      accessLink: result.accessLink,
      tempPassword: result.tempPassword,
      userName: formData.name,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setCreatedUser(null);
    setCopied(false);
    setFormData({
      name: '',
      email: '',
      cpf: '',
      role: '',
      pdvId: '',
      modules: [],
    });
  };

  const handleCopy = async () => {
    const textToCopy = createdUser?.accessLink || createdUser?.tempPassword;
    if (!textToCopy) return;
    
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!createdUser?.accessLink) return;
    const message = encodeURIComponent(
      `Olá ${createdUser.userName}! 👋\n\nAqui está seu link de acesso ao sistema SR Off Trade Marketing:\n\n${createdUser.accessLink}\n\nClique no link acima para entrar no sistema. Este link é pessoal e não deve ser compartilhado.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleOpenLink = () => {
    if (!createdUser?.accessLink) return;
    window.open(createdUser.accessLink, '_blank');
  };

  // Show result dialog after user creation
  if (createdUser) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createdUser.role === 'super_admin' ? (
                <Key className="h-5 w-5 text-primary" />
              ) : (
                <Link2 className="h-5 w-5 text-primary" />
              )}
              Usuário Criado
            </DialogTitle>
            <DialogDescription>
              {createdUser.role === 'super_admin' 
                ? 'Compartilhe a senha temporária com o novo Super Admin'
                : 'Compartilhe o link de acesso com o usuário'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {createdUser.role === 'super_admin' ? (
                      <Shield className="h-5 w-5 text-primary" />
                    ) : (
                      <Link2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{createdUser.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {roles.find(r => r.value === createdUser.role)?.label}
                    </p>
                  </div>
                </div>

                <Separator className="mb-4" />

                <div className="space-y-3">
                  <Label>
                    {createdUser.role === 'super_admin' ? 'Senha Temporária' : 'Link de Acesso'}
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      value={createdUser.accessLink || createdUser.tempPassword || ''} 
                      readOnly 
                      className="text-xs font-mono"
                    />
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {createdUser.accessLink && (
                  <>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="flex-col h-auto py-3"
                      >
                        <Copy className="h-4 w-4 mb-1" />
                        <span className="text-xs">Copiar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWhatsApp}
                        className="flex-col h-auto py-3"
                      >
                        <MessageCircle className="h-4 w-4 mb-1" />
                        <span className="text-xs">WhatsApp</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenLink}
                        className="flex-col h-auto py-3"
                      >
                        <ExternalLink className="h-4 w-4 mb-1" />
                        <span className="text-xs">Testar</span>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              {createdUser.role === 'super_admin' 
                ? 'O usuário deve trocar a senha após o primeiro login.'
                : 'O link é válido por 1 ano e pode ser renovado a qualquer momento.'}
            </p>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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

          {/* Info about access method based on role */}
          {formData.role && (
            <Card className="bg-muted/50 border-muted">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  {formData.role === 'super_admin' ? (
                    <>
                      <Key className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Acesso por senha</p>
                        <p className="text-muted-foreground text-xs">
                          Super Admins fazem login com email e senha na tela de autenticação.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Acesso por link pessoal</p>
                        <p className="text-muted-foreground text-xs">
                          Este usuário receberá um link de acesso único para entrar no sistema sem senha.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
            <Button type="button" variant="outline" onClick={handleClose}>
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
