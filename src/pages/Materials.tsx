import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockMaterials } from '@/data/mockData';
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
  Edit
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
import { NewMaterialDialog } from '@/components/dialogs/NewMaterialDialog';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState(false);

  const filteredMaterials = mockMaterials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || material.type === typeFilter;
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && material.currentStock <= material.minimumStock) ||
                        (stockFilter === 'normal' && material.currentStock > material.minimumStock);
    return matchesSearch && matchesType && matchesStock;
  });

  const stats = {
    total: mockMaterials.length,
    active: mockMaterials.filter(m => m.status === 'active').length,
    lowStock: mockMaterials.filter(m => m.currentStock <= m.minimumStock).length,
    totalValue: mockMaterials.reduce((acc, m) => acc + (m.currentStock * m.unitCost), 0),
  };

  const materialTypes = [...new Set(mockMaterials.map(m => m.type))];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Materiais</h1>
            <p className="text-muted-foreground mt-1">Gestão de materiais de trade marketing</p>
          </div>
          <Button onClick={() => setIsNewMaterialOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Material
          </Button>
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
                const isLowStock = material.currentStock <= material.minimumStock;
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
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(material.unitCost)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <span className={cn(
                          "font-semibold",
                          isLowStock ? "text-warning" : "text-foreground"
                        )}>
                          {material.currentStock}
                        </span>
                        <span className="text-muted-foreground text-xs">/ {material.minimumStock} min</span>
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
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
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
    </AppLayout>
  );
}
