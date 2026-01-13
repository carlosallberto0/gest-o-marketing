import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, DollarSign, FileText, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLoteamentosLancamentos, useLoteamentosPagamentos, useLoteamentosContratos } from '@/hooks/useLoteamentos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardLoteamentos() {
  const navigate = useNavigate();
  const { data: lancamentos = [] } = useLoteamentosLancamentos();
  const { data: pagamentos = [] } = useLoteamentosPagamentos();
  const { data: contratos = [] } = useLoteamentosContratos();

  const pagamentosPendentes = pagamentos.filter(p => p.status === 'pendente');
  const valorPendente = pagamentosPendentes.reduce((acc, p) => acc + Number(p.valor), 0);
  const contratosAtivos = contratos.filter(c => c.status !== 'cancelado').length;

  const stats = [
    { title: 'Lançamentos', value: lancamentos.length, icon: Home, color: 'bg-emerald-500', description: 'Total cadastrados' },
    { title: 'Pagamentos Pendentes', value: pagamentosPendentes.length, icon: DollarSign, color: 'bg-amber-500', description: `R$ ${valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
    { title: 'Contratos Ativos', value: contratosAtivos, icon: FileText, color: 'bg-blue-500', description: `${contratos.length} total` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Loteamentos</h1>
          <p className="text-muted-foreground">Gerencie lançamentos, pagamentos e contratos</p>
        </div>
        <Button onClick={() => navigate('/loteamentos/lancamentos')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Ações Rápidas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/loteamentos/lancamentos')}><Home className="h-4 w-4 mr-3" />Ver Lançamentos</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/loteamentos/pagamentos')}><DollarSign className="h-4 w-4 mr-3" />Ver Pagamentos</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/loteamentos/contratos')}><FileText className="h-4 w-4 mr-3" />Ver Contratos</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Pagamentos Próximos</CardTitle></CardHeader>
          <CardContent>
            {pagamentosPendentes.slice(0, 5).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhum pagamento pendente</p>
            ) : (
              <div className="space-y-2">
                {pagamentosPendentes.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground">{p.lancamento?.nome}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      {p.data_vencimento && <p className="text-xs text-muted-foreground">{format(new Date(p.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
