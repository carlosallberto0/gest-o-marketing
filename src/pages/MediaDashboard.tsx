import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard } from '@/components/dashboard/ScoreCard';
import { mockOutdoors, getStatusColor } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { 
  Megaphone, 
  AlertTriangle,
  ArrowRight,
  FileText,
  Truck,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MediaDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const totalOutdoors = mockOutdoors.length;
  const operationalOutdoors = mockOutdoors.filter(o => o.status === 'operational').length;
  const nonOperationalOutdoors = mockOutdoors.filter(o => o.status === 'non_operational').length;
  const pendingEvaluations = mockOutdoors.filter(o => o.status === 'pending_evaluation').length;
  const operationalRate = Math.round((operationalOutdoors / totalOutdoors) * 100);

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

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Mídia Externa
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestão de outdoors, contratos e ordens de serviço
            </p>
          </div>
          <Button onClick={() => navigate('/outdoor-evaluation')} size="lg">
            <Megaphone className="h-5 w-5 mr-2" />
            Avaliar Outdoor
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard 
            title="Taxa Operacional" 
            score={operationalRate} 
            subtitle={`${operationalOutdoors}/${totalOutdoors} outdoors`}
            trend={-2}
            icon={<CheckCircle className="h-5 w-5 text-white" />}
          />
          <ScoreCard 
            title="Total Outdoors" 
            score={totalOutdoors} 
            subtitle="Cadastrados"
            icon={<Megaphone className="h-5 w-5 text-white" />}
            className="[&>div>div:first-child>div:last-child]:hidden"
          />
          <ScoreCard 
            title="Contratos" 
            score={mockOutdoors.filter(o => o.contractId).length} 
            subtitle="Ativos"
            icon={<FileText className="h-5 w-5 text-white" />}
            className="[&>div>div:first-child>div:last-child]:hidden"
          />
          <div className="bg-destructive/10 rounded-xl p-5 border border-destructive/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Pendentes</p>
                <p className="text-3xl font-bold text-destructive mt-2">{pendingEvaluations}</p>
                <p className="text-xs text-destructive/70 mt-1">Aguardam avaliação</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-destructive flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
              </div>
            </div>
          </div>
        </div>

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
                { label: 'Operacionais', count: operationalOutdoors, status: 'operational', icon: CheckCircle },
                { label: 'Não Operacionais', count: nonOperationalOutdoors, status: 'non_operational', icon: AlertTriangle },
                { label: 'Aguardando Avaliação', count: pendingEvaluations, status: 'pending_evaluation', icon: Megaphone },
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
                      style={{ width: `${(item.count / totalOutdoors) * 100}%`, transitionDelay: `${index * 100}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
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
        </div>

        {/* Recent Outdoors */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-lg">Outdoors Recentes</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/outdoors')}>
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockOutdoors.slice(0, 6).map((outdoor, index) => (
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
                  <p className="text-sm text-muted-foreground mb-2">{outdoor.location}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{outdoor.width}m x {outdoor.height}m</span>
                    <span>{outdoor.area}m²</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
