import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  Plus, 
  FileText, 
  AlertTriangle, 
  Search,
  ExternalLink,
  Trash2,
  Edit,
  Loader2
} from 'lucide-react';
import { useCustosExternos, useCustosExternosKPIs, useDeleteCustoExterno } from '@/hooks/useCustosExternos';
import { useActiveSuppliers } from '@/hooks/useSuppliers';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const tipoLabels: Record<string, string> = {
  material: 'Material/Insumo',
  transporte: 'Transporte',
  mao_obra: 'Mão de Obra',
  outro: 'Outro',
};

const tipoColors: Record<string, string> = {
  material: 'bg-blue-100 text-blue-800',
  transporte: 'bg-purple-100 text-purple-800',
  mao_obra: 'bg-orange-100 text-orange-800',
  outro: 'bg-gray-100 text-gray-800',
};

export function CustosExternosContent() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [fornecedorFilter, setFornecedorFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: custos, isLoading } = useCustosExternos({
    tipo: tipoFilter === 'all' ? undefined : tipoFilter,
    fornecedorId: fornecedorFilter === 'all' ? undefined : fornecedorFilter,
  });
  const { data: kpis } = useCustosExternosKPIs();
  const { data: fornecedores } = useActiveSuppliers();
  const deleteMutation = useDeleteCustoExterno();

  const filteredCustos = custos?.filter(custo => 
    custo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    custo.fornecedor?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Custos Externos</h1>
          <p className="text-muted-foreground">Registre e gerencie custos reais informados pelos fornecedores</p>
        </div>
        <Button onClick={() => navigate('/financeiro/custos/registrar')} className="gap-2">
          <Plus className="h-4 w-4" />
          Registrar Custo
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Líquido</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {(kpis?.totalLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros</p>
                <p className="text-2xl font-bold">{kpis?.registros || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Com Perdas</p>
                <p className="text-2xl font-bold text-red-600">{kpis?.comPerdas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Perdas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  R$ {(kpis?.totalPerdas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo de custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="material">Material/Insumo</SelectItem>
                <SelectItem value="transporte">Transporte</SelectItem>
                <SelectItem value="mao_obra">Mão de Obra</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={fornecedorFilter} onValueChange={setFornecedorFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                {fornecedores?.filter(f => !!f.id).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Custos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCustos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum custo registrado</p>
              <Button 
                variant="link" 
                onClick={() => navigate('/financeiro/custos/registrar')}
                className="mt-2"
              >
                Registrar primeiro custo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustos.map(custo => {
                const custoLiquido = Number(custo.valor_total) - Number(custo.perda_valor || 0);
                const postosCount = custo.alocacoes?.length || 0;

                return (
                  <div 
                    key={custo.id} 
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={tipoColors[custo.tipo]}>
                            {tipoLabels[custo.tipo]}
                          </Badge>
                          {custo.teve_perdas && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Perda
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground">{custo.descricao}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                          <span>{custo.fornecedor?.name}</span>
                          <span>•</span>
                          <span>{format(new Date(custo.data_compra), "dd/MM/yyyy", { locale: ptBR })}</span>
                          <span>•</span>
                          <span>{postosCount} posto(s)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            R$ {custoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {custo.teve_perdas && (
                            <p className="text-xs text-red-600">
                              -R$ {Number(custo.perda_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {custo.comprovante_url && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => window.open(custo.comprovante_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/financeiro/custos/${custo.id}/rateio`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setDeleteId(custo.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de custo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CustosExternos() {
  return <CustosExternosContent />;
}
