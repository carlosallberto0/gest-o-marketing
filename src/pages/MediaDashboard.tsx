import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard } from '@/components/dashboard/ScoreCard';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { useMonthlyReviewSummary } from '@/hooks/useOutdoorMonthlyReviews';
import { getStatusColor } from '@/lib/helpers';
import { useNavigate } from 'react-router-dom';
import { 
  Megaphone, 
  AlertTriangle,
  ArrowRight,
  FileText,
  Truck,
  CheckCircle,
  Loader2,
  MapPin,
  ExternalLink,
  ClipboardCheck,
  Wrench,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FinancialKPICard } from '@/components/dashboard/FinancialKPICard';
import { CostDistributionChart } from '@/components/dashboard/CostDistributionChart';

export default function MediaDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = profile?.role === 'super_admin';
  const isDirector = profile?.role === 'director';
  const isManager = profile?.role === 'manager' || profile?.role === 'collaborator';

  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: outdoors = [], isLoading: isLoadingOutdoors } = useOutdoors();
  const { data: reviewSummary, isLoading: isLoadingReviews } = useMonthlyReviewSummary();
  const isLoading = isLoadingStats || isLoadingOutdoors || isLoadingReviews;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-success/10 text-success border-success/20">Operacional</Badge>;
      case 'non_operational':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Não Operacional</Badge>;
      case 'pending_evaluation':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Aguardando</Badge>;
      default:
        return null;
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
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isDirector ? 'Visão Estratégica' : 'Mídia Externa'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isDirector 
                ? 'Monitoramento de KPIs e aprovações pendentes'
                : 'Gestão de outdoors, contratos e ordens de serviço'}
            </p>
          </div>
          {/* Hide "Avaliar Outdoor" button for directors */}
          {!isDirector && (
            <Button onClick={() => navigate('/outdoor-evaluation')} size="lg">
              <Megaphone className="h-5 w-5 mr-2" />
              Avaliar Outdoor
            </Button>
          )}
        </div>

        {/* Stats - Hidden for managers, Strategic KPIs for directors */}
        {!isManager && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ScoreCard 
              title="Taxa Operacional" 
              score={stats?.operationalRate || 0} 
              subtitle={`${stats?.operationalOutdoors || 0}/${stats?.totalOutdoors || 0} outdoors`}
              trend={-2}
              icon={<CheckCircle className="h-5 w-5 text-white" />}
            />
            {/* Directors see strategic KPIs only */}
            {isDirector ? (
              <>
                <div className="bg-warning/10 rounded-xl p-5 border border-warning/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-warning">Manutenções Pendentes</p>
                      <p className="text-3xl font-bold text-warning mt-2">{stats?.pendingEvaluations || 0}</p>
                      <p className="text-xs text-warning/70 mt-1">Aguardam aprovação</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-warning flex items-center justify-center">
                      <Wrench className="h-6 w-6 text-warning-foreground" />
                    </div>
                  </div>
                </div>
                <ScoreCard 
                  title="Contratos" 
                  score={stats?.activeContracts || 0} 
                  subtitle="Próximos do vencimento"
                  icon={<FileText className="h-5 w-5 text-white" />}
                  className="[&>div>div:first-child>div:last-child]:hidden"
                />
                <div className="bg-info/10 rounded-xl p-5 border border-info/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-info">Investimento Mensal</p>
                      <p className="text-3xl font-bold text-info mt-2">R$ {((stats?.totalOutdoors || 0) * 150).toLocaleString('pt-BR')}</p>
                      <p className="text-xs text-info/70 mt-1">Mídia externa</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-info flex items-center justify-center">
                      <FileText className="h-6 w-6 text-info-foreground" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <ScoreCard 
                  title="Total Outdoors" 
                  score={stats?.totalOutdoors || 0} 
                  subtitle="Cadastrados"
                  icon={<Megaphone className="h-5 w-5 text-white" />}
                  className="[&>div>div:first-child>div:last-child]:hidden"
                />
                <ScoreCard 
                  title="Contratos" 
                  score={stats?.activeContracts || 0} 
                  subtitle="Ativos"
                  icon={<FileText className="h-5 w-5 text-white" />}
                  className="[&>div>div:first-child>div:last-child]:hidden"
                />
                <div className="bg-destructive/10 rounded-xl p-5 border border-destructive/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">Pendentes</p>
                      <p className="text-3xl font-bold text-destructive mt-2">{stats?.pendingEvaluations || 0}</p>
                      <p className="text-xs text-destructive/70 mt-1">Aguardam avaliação</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-destructive flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Status Overview */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Status dos Outdoors</h3>
                <p className="text-sm text-muted-foreground">Distribuição por status</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Operacionais', count: stats?.operationalOutdoors || 0, status: 'operational', icon: CheckCircle },
                { label: 'Não Operacionais', count: stats?.nonOperationalOutdoors || 0, status: 'non_operational', icon: AlertTriangle },
                { label: 'Aguardando Avaliação', count: stats?.pendingEvaluations || 0, status: 'pending_evaluation', icon: Megaphone },
              ].map((item, index) => (
                <div key={item.label} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <item.icon className={cn(
                        "h-4 w-4",
                        item.status === 'operational' ? 'text-success' :
                        item.status === 'pending_evaluation' ? 'text-warning' : 'text-destructive'
                      )} />
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      getStatusColor(item.status)
                    )}>
                      {item.count}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        item.status === 'operational' ? 'bg-success' :
                        item.status === 'pending_evaluation' ? 'bg-warning' : 'bg-destructive'
                      )}
                      style={{ width: `${(stats?.totalOutdoors || 0) > 0 ? (item.count / (stats?.totalOutdoors || 1)) * 100 : 0}%`, transitionDelay: `${index * 100}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions - Hidden for managers and directors */}
          {!isManager && !isDirector && (
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Ações Rápidas</h3>
                  <p className="text-sm text-muted-foreground">Acesso rápido às funcionalidades</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/outdoors')}>
                  <Megaphone className="h-5 w-5" />
                  <span className="text-xs">Ver Outdoors</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/contracts')}>
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Contratos</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/outdoor-evaluation')}>
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-xs">Nova Avaliação</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" disabled>
                  <Truck className="h-5 w-5" />
                  <span className="text-xs">Ordens de Serviço</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Review Summary - Only for super_admin */}
        {isSuperAdmin && (
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Revisões Mensais</h3>
                <p className="text-sm text-muted-foreground">Resumo das avaliações do mês atual</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/maintenance-requests')}>
                Ver detalhes
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{reviewSummary?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Avaliados</p>
              </div>
              <div className="bg-success/10 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <p className="text-2xl font-bold text-success">{reviewSummary?.approved || 0}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </div>
              <div className="bg-orange-500/10 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-600">{reviewSummary?.needsMaintenance || 0}</p>
                <p className="text-xs text-muted-foreground">Precisam Manutenção</p>
              </div>
            </div>
          </div>
        )}

        {/* Financial Section - Super Admin and Director only */}
        {(isSuperAdmin || isDirector) && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground text-lg">Visão Financeira</h3>
            </div>
            <FinancialKPICard showDetails={isSuperAdmin} />
            <CostDistributionChart showDetails={isSuperAdmin} />
          </div>
        )}

        {/* Recent Outdoors - Hidden for directors */}
        {!isDirector && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-lg">Outdoors Recentes</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/outdoors')}>
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {outdoors.slice(0, 6).map((outdoor, index) => (
                <Card 
                  key={outdoor.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{outdoor.code}</CardTitle>
                      {getStatusBadge(outdoor.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = outdoor.location?.startsWith('http') ? outdoor.location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(outdoor.location || '')}`;
                        if (url) window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="flex items-center gap-1 text-sm text-primary hover:underline mb-2 text-left"
                    >
                      <MapPin className="h-3 w-3" />
                      <span>Ver no Google Maps</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{outdoor.width}m x {outdoor.height}m</span>
                      <span>{outdoor.area}m²</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
