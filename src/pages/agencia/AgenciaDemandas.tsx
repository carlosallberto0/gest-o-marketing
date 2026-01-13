import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ClipboardList, Calendar } from 'lucide-react';
import { useAgencias, useAgenciaDemandas, useCreateAgenciaDemanda, useUpdateAgenciaDemanda } from '@/hooks/useAgencias';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusOptions = [
  { value: 'pendente', label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  { value: 'em_producao', label: 'Em Produção', color: 'bg-blue-100 text-blue-700' },
  { value: 'revisao', label: 'Em Revisão', color: 'bg-purple-100 text-purple-700' },
  { value: 'entregue', label: 'Entregue', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-700' },
];

const categoriaOptions = [
  { value: 'video', label: 'Vídeo' },
  { value: 'foto', label: 'Foto' },
  { value: 'design', label: 'Design' },
  { value: 'outros', label: 'Outros' },
];

export default function AgenciaDemandas() {
  const { data: agencias = [] } = useAgencias();
  const { data: demandas = [], isLoading } = useAgenciaDemandas();
  const createDemanda = useCreateAgenciaDemanda();
  const updateDemanda = useUpdateAgenciaDemanda();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    agencia_id: '',
    titulo: '',
    descricao: '',
    categoria: 'outros',
    status: 'pendente',
    prazo_entrega: '',
  });

  const filteredDemandas = demandas.filter(d => {
    const matchesSearch = d.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.agencia?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async () => {
    await createDemanda.mutateAsync({
      ...formData,
      prazo_entrega: formData.prazo_entrega || null,
      created_by: null,
    });
    setIsDialogOpen(false);
    setFormData({ agencia_id: '', titulo: '', descricao: '', categoria: 'outros', status: 'pendente', prazo_entrega: '' });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateDemanda.mutateAsync({ id, status: newStatus });
  };

  const getStatusInfo = (status: string) => statusOptions.find(s => s.value === status) || statusOptions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demandas</h1>
          <p className="text-muted-foreground">Gerencie as demandas enviadas às agências</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Demanda
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar demandas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Demanda</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filteredDemandas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma demanda encontrada</TableCell></TableRow>
              ) : (
                filteredDemandas.map((demanda) => {
                  const statusInfo = getStatusInfo(demanda.status);
                  return (
                    <TableRow key={demanda.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <ClipboardList className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{demanda.titulo}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{demanda.descricao}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{demanda.agencia?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoriaOptions.find(c => c.value === demanda.categoria)?.label || demanda.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {demanda.prazo_entrega ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(demanda.prazo_entrega), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Select value={demanda.status} onValueChange={(v) => handleStatusChange(demanda.id, v)}>
                          <SelectTrigger className={`w-[140px] h-8 text-xs ${statusInfo.color}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Demanda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agência *</Label>
              <Select value={formData.agencia_id} onValueChange={(v) => setFormData({ ...formData, agencia_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma agência" />
                </SelectTrigger>
                <SelectContent>
                  {agencias.filter(a => a.ativo).map(ag => (
                    <SelectItem key={ag.id} value={ag.id}>{ag.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título da demanda"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva a demanda em detalhes"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriaOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo de Entrega</Label>
                <Input
                  type="date"
                  value={formData.prazo_entrega}
                  onChange={(e) => setFormData({ ...formData, prazo_entrega: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formData.agencia_id || !formData.titulo || !formData.descricao || createDemanda.isPending}>
              Criar Demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
