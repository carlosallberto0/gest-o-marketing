import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats, usePDVsWithStats } from '@/hooks/useDashboardStats';
import { useMaterialRequests } from '@/hooks/useMaterialRequests';
import { useMerchEvaluations } from '@/hooks/useMerchEvaluations';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Package,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle,
  TrendingUp,
  Store
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SupervisorDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: pdvs = [], isLoading: isLoadingPDVs } = usePDVsWithStats('merchandising');
  const { data: materialRequests = [], isLoading: isLoadingMaterials } = useMaterialRequests();
  const { data: evaluations = [], isLoading: isLoadingEvaluations } = useMerchEvaluations();

  const isLoading = isLoadingStats || isLoadingPDVs || isLoadingMaterials || isLoadingEvaluations;

  // Filter recent evaluations (last 7 days)
  const recentEvaluations = evaluations
    .filter(e => {
      const evalDate = new Date(e.evaluation_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return evalDate >= weekAgo;
    })
    .slice(0, 5);

  // Filter pending material requests
  const pendingRequests = materialRequests
    .filter(r => r.status === 'pending' || r.status === 'approved')
    .slice(0, 5);

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
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Olá, {profile?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            O que você gostaria de fazer hoje?
          </p>
        </div>

        {/* Main Actions - Two Big Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Avaliar PDV Card */}
          <Card className="border-2 border-green-500/30 hover:border-green-500/60 transition-colors cursor-pointer group overflow-hidden"
                onClick={() => navigate('/checklist')}>
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    <ClipboardCheck className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">AVALIAR PDV</h2>
                    <p className="text-green-100 text-sm">Realizar checklist de merchandising</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-muted-foreground mb-4">
                  Avalie as condições de merchandising e registre os materiais positivados nos PDVs.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="h-4 w-4" />
                    <span>{pdvs.length} PDVs disponíveis</span>
                  </div>
                  <Button variant="ghost" className="group-hover:translate-x-1 transition-transform">
                    Iniciar <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Solicitar Material Card */}
          <Card className="border-2 border-blue-500/30 hover:border-blue-500/60 transition-colors cursor-pointer group overflow-hidden"
                onClick={() => navigate('/material-requests')}>
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Package className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">SOLICITAR MATERIAL</h2>
                    <p className="text-blue-100 text-sm">Solicitar materiais de estoque</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-muted-foreground mb-4">
                  Solicite materiais em estoque para reposição ou campanhas nos seus PDVs.
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{pendingRequests.length} solicitações em andamento</span>
                  </div>
                  <Button variant="ghost" className="group-hover:translate-x-1 transition-transform">
                    Solicitar <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Score Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{stats?.avgMerchScore || 0}%</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avaliações (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMerchEvaluations || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">PDVs Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pdvs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Solicitações Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Evaluations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Avaliações Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentEvaluations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma avaliação recente
                </p>
              ) : (
                <div className="space-y-3">
                  {recentEvaluations.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{evaluation.pdv?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(evaluation.evaluation_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <Badge className={
                        evaluation.percentage_score >= 90 ? 'bg-green-500' :
                        evaluation.percentage_score >= 75 ? 'bg-emerald-500' :
                        evaluation.percentage_score >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }>
                        {evaluation.percentage_score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Material Requests */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Solicitações em Andamento</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/material-requests')}>
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma solicitação pendente
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{request.material?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qtd: {request.quantity} - {request.pdv?.name}
                        </p>
                      </div>
                      <Badge className={
                        request.status === 'approved' ? 'bg-green-500' :
                        request.status === 'pending' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }>
                        {request.status === 'approved' ? 'Aprovada' :
                         request.status === 'pending' ? 'Pendente' :
                         request.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
