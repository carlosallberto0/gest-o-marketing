import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle,
  Filter,
  Eye,
  Edit,
  Loader2,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NewMaterialDialog } from '@/components/dialogs/NewMaterialDialog';
import { WithdrawMaterialDialog } from '@/components/dialogs/WithdrawMaterialDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const getMaterialTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    promotional: 'Promocional',
    printed: 'Impresso',
    gift: 'Brinde',
    sample: 'Amostra',
    display: 'Display',
    signage: 'Sinalização',
    sticker: 'Adesivo',
    banner: 'Banner',
    poster: 'Pôster',
    flyer: 'Folheto',
  };
  return labels[type] || type;
};

export default function Materials() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<any | null>(null);
  const [editMaterial, setEditMaterial] = useState<any | null>(null);
  const [withdrawMaterial, setWithdrawMaterial] = useState<any | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  // Fetch materials from database
  const { data: materials = [], isLoading, refetch } = useQuery({
    queryKey: ['trade-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_materials')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || material.type === typeFilter;
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && material.current_stock <= material.minimum_stock) ||
                        (stockFilter === 'normal' && material.current_stock > material.minimum_stock);
    return matchesSearch && matchesType && matchesStock;
  });

  const stats = {
    total: materials.length,
    active: materials.filter(m => m.status === 'active').length,
    lowStock: materials.filter(m => m.current_stock <= m.minimum_stock).length,
    totalValue: materials.reduce((acc, m) => acc + (m.current_stock * Number(m.unit_cost)), 0),
  };

  const materialTypes = [...new Set(materials.map(m => m.type))];

  const handleSaveEdit = async () => {
    if (!editMaterial) return;
    
    try {
      const { error } = await supabase
        .from('trade_materials')
        .update({
          name: editMaterial.name,
          description: editMaterial.description,
          current_stock: editMaterial.current_stock,
          minimum_stock: editMaterial.minimum_stock,
          unit_cost: editMaterial.unit_cost,
        })
        .eq('id', editMaterial.id);

      if (error) throw error;
      
      toast.success('Material atualizado com sucesso!');
      setEditMaterial(null);
      refetch();
    } catch (error) {
      toast.error('Erro ao atualizar material');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Materiais</h1>
            <p className="text-muted-foreground mt-1">Gestão de materiais de trade marketing</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setIsNewMaterialOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Material
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total de Itens</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Ativos</p>
            <p className="text-2xl font-bold text-success">{stats.active}</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-sm text-warning">Estoque Baixo</p>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.lowStock}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-primary">Valor em Estoque</p>
            <p className="text-xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {materialTypes.map(type => (
                <SelectItem key={type} value={type}>{getMaterialTypeLabel(type)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo estoque</SelectItem>
              <SelectItem value="low">Estoque baixo</SelectItem>
              <SelectItem value="normal">Estoque normal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Materials Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((material, index) => {
                const isLowStock = material.current_stock <= material.minimum_stock;
                return (
                  <TableRow 
                    key={material.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-xs text-muted-foreground">{material.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMaterialTypeLabel(material.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{material.category}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(material.unit_cost))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <span className={cn(
                          "font-semibold",
                          isLowStock ? "text-warning" : "text-foreground"
                        )}>
                          {material.current_stock}
                        </span>
                        <span className="text-muted-foreground text-xs">/ {material.minimum_stock} min</span>
                        {isLowStock && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={material.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                        {material.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewMaterial(material)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditMaterial({ ...material })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isSuperAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setWithdrawMaterial(material)}
                            title="Retirar do estoque"
                          >
                            <Minus className="h-4 w-4 text-warning" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredMaterials.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhum material encontrado</p>
          </div>
        )}
      </div>

      <NewMaterialDialog open={isNewMaterialOpen} onOpenChange={setIsNewMaterialOpen} />

      {/* View Material Dialog */}
      <Dialog open={!!viewMaterial} onOpenChange={() => setViewMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Material</DialogTitle>
          </DialogHeader>
          {viewMaterial && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{viewMaterial.name}</h3>
                  <p className="text-sm text-muted-foreground">{viewMaterial.code}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{getMaterialTypeLabel(viewMaterial.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{viewMaterial.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Unitário</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(viewMaterial.unit_cost))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Atual</p>
                  <p className="font-medium">{viewMaterial.current_stock} unidades</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Mínimo</p>
                  <p className="font-medium">{viewMaterial.minimum_stock} unidades</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={viewMaterial.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                    {viewMaterial.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
              {viewMaterial.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="text-sm">{viewMaterial.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={!!editMaterial} onOpenChange={() => setEditMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Material</DialogTitle>
          </DialogHeader>
          {editMaterial && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={editMaterial.code}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">O código não pode ser alterado</p>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editMaterial.name}
                  onChange={(e) => setEditMaterial({ ...editMaterial, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editMaterial.description || ''}
                  onChange={(e) => setEditMaterial({ ...editMaterial, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Custo Unitário</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editMaterial.unit_cost}
                    onChange={(e) => setEditMaterial({ ...editMaterial, unit_cost: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Atual</Label>
                  <Input
                    type="number"
                    value={editMaterial.current_stock}
                    onChange={(e) => setEditMaterial({ ...editMaterial, current_stock: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Mínimo</Label>
                  <Input
                    type="number"
                    value={editMaterial.minimum_stock}
                    onChange={(e) => setEditMaterial({ ...editMaterial, minimum_stock: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditMaterial(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw Material Dialog */}
      <WithdrawMaterialDialog 
        open={!!withdrawMaterial} 
        onOpenChange={(open) => !open && setWithdrawMaterial(null)}
        material={withdrawMaterial}
      />
    </AppLayout>
  );
}