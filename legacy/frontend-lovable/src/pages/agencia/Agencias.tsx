import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Building2, Search } from 'lucide-react';
import { useAgencias, useCreateAgencia, useUpdateAgencia, useDeleteAgencia, Agencia } from '@/hooks/useAgencias';

export default function Agencias() {
  const { data: agencias = [], isLoading } = useAgencias();
  const createAgencia = useCreateAgencia();
  const updateAgencia = useUpdateAgencia();
  const deleteAgencia = useDeleteAgencia();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgencia, setEditingAgencia] = useState<Agencia | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    contato_nome: '',
    contato_email: '',
    contato_telefone: '',
    especialidades: [] as string[],
    ativo: true,
  });
  const [especialidadeInput, setEspecialidadeInput] = useState('');

  const filteredAgencias = agencias.filter(a => 
    a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.contato_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewDialog = () => {
    setEditingAgencia(null);
    setFormData({ nome: '', contato_nome: '', contato_email: '', contato_telefone: '', especialidades: [], ativo: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (agencia: Agencia) => {
    setEditingAgencia(agencia);
    setFormData({
      nome: agencia.nome,
      contato_nome: agencia.contato_nome || '',
      contato_email: agencia.contato_email || '',
      contato_telefone: agencia.contato_telefone || '',
      especialidades: agencia.especialidades || [],
      ativo: agencia.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingAgencia) {
      await updateAgencia.mutateAsync({ id: editingAgencia.id, ...formData });
    } else {
      await createAgencia.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta agência?')) {
      await deleteAgencia.mutateAsync(id);
    }
  };

  const addEspecialidade = () => {
    if (especialidadeInput.trim() && !formData.especialidades.includes(especialidadeInput.trim())) {
      setFormData({ ...formData, especialidades: [...formData.especialidades, especialidadeInput.trim()] });
      setEspecialidadeInput('');
    }
  };

  const removeEspecialidade = (esp: string) => {
    setFormData({ ...formData, especialidades: formData.especialidades.filter(e => e !== esp) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agências Parceiras</h1>
          <p className="text-muted-foreground">Gerencie as agências de marketing parceiras</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Agência
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar agências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agência</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Especialidades</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : filteredAgencias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma agência encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredAgencias.map((agencia) => (
                  <TableRow key={agencia.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{agencia.nome}</p>
                          <p className="text-xs text-muted-foreground">{agencia.contato_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{agencia.contato_nome || '-'}</p>
                        <p className="text-xs text-muted-foreground">{agencia.contato_telefone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {agencia.especialidades?.slice(0, 3).map((esp) => (
                          <Badge key={esp} variant="secondary" className="text-xs">{esp}</Badge>
                        ))}
                        {(agencia.especialidades?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">+{agencia.especialidades!.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agencia.ativo ? 'default' : 'secondary'}>
                        {agencia.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(agencia)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(agencia.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAgencia ? 'Editar Agência' : 'Nova Agência'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Agência *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome da agência"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Contato</Label>
              <Input
                value={formData.contato_nome}
                onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                placeholder="Nome do contato principal"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contato_email}
                  onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
                  placeholder="email@agencia.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.contato_telefone}
                  onChange={(e) => setFormData({ ...formData, contato_telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Especialidades</Label>
              <div className="flex gap-2">
                <Input
                  value={especialidadeInput}
                  onChange={(e) => setEspecialidadeInput(e.target.value)}
                  placeholder="Ex: Vídeo, Foto, Design"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEspecialidade())}
                />
                <Button type="button" variant="outline" onClick={addEspecialidade}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.especialidades.map((esp) => (
                  <Badge key={esp} variant="secondary" className="cursor-pointer" onClick={() => removeEspecialidade(esp)}>
                    {esp} ×
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label>Agência Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formData.nome || createAgencia.isPending || updateAgencia.isPending}>
              {editingAgencia ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
