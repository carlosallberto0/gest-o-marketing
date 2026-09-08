import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard } from '@/components/dashboard/ScoreCard';
import { PDVCard } from '@/components/dashboard/StoreCard';
import { EvolutionChart } from '@/components/dashboard/EvolutionChart';
import { CriticalItemsCard } from '@/components/dashboard/CriticalItemsCard';
import { ContractAlertsCard } from '@/components/dashboard/ContractAlertsCard';
import { useDashboardStats, usePDVsWithStats, useCategoryAverages } from '@/hooks/useDashboardStats';
import { useEvolutionData, useCriticalItems, useExpiringContracts } from '@/hooks/useAdvancedStats';
import { getStatusColor } from '@/lib/helpers';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ClipboardCheck, 
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Megaphone,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { profile, hasModule } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: pdvs = [], isLoading: isLoadingPDVs } = usePDVsWithStats();
  const { data: categoryAvg = [] } = useCategoryAverages();
  const { data: evolutionData = [] } = useEvolutionData();
  const { data: criticalItems = [] } = useCriticalItems();
  const { data: expiringContracts = [] } = useExpiringContracts();

  const isLoading = isLoadingStats || isLoadingPDVs;

  // Filter PDVs by module
  const pdvsWithMerch = pdvs.filter(p => p.active_modules.includes('merchandising'));

  // Prepare chart data
  const merchChartData = pdvsWithMerch.map(pdv => ({
    name: pdv.name.replace('Posto ', '').replace('Conveniência ', '').substring(0, 12),
    score: pdv.lastMerchScore || 0,
  }));

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
              Olá, {profile?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Dashboard integrado - Mídia Externa + Merchandising
            </p>
          </div>
          <div className="flex gap-2">
            {hasModule('merchandising') && (
              <Button onClick={() => navigate('/merchandising/checklist')} size="lg">
                <ClipboardCheck className="h-5 w-5 mr-2" />
                Novo Checklist
              </Button>
            )}
            {hasModule('media') && (
              <Button onClick={() => navigate('/outdoor-evaluation')} variant="outline" size="lg">
                <Megaphone className="h-5 w-5 mr-2" />
                Avaliar Outdoor
              </Button>
            )}
          </div>
        </div>

        {/* Module Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {hasModule('merchandising') && (
            <>
              <ScoreCard 
                title="Score Médio Merch" 
                score={stats?.avgMerchScore || 0} 
                subtitle="Merchandising"
                trend={3}
                icon={<TrendingUp className="h-5 w-5 text-white" />}
              />
              <ScoreCard 
                title="Avaliações" 
                score={stats?.totalMerchEvaluations || 0} 
                subtitle="Este mês"
                icon={<ClipboardCheck className="h-5 w-5 text-white" />}
                isPercentage={false}
              />
            </>
          )}
          
          {hasModule('media') && (
            <>
              <ScoreCard 
                title="Taxa Operacional" 
                score={stats?.operationalRate || 0} 
                subtitle={`${stats?.operationalOutdoors || 0}/${stats?.totalOutdoors || 0} outdoors`}
                trend={-2}
                icon={<Megaphone className="h-5 w-5 text-white" />}
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

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Merchandising Chart */}
          {hasModule('merchandising') && merchChartData.length > 0 && (
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Performance Merchandising</h3>
                  <p className="text-sm text-muted-foreground">Score por PDV</p>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={merchChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Score']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {merchChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.score >= 90 ? 'hsl(var(--success))' : 
                                entry.score >= 75 ? 'hsl(152, 69%, 50%)' :
                                entry.score >= 60 ? 'hsl(var(--warning))' : 
                                'hsl(var(--destructive))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category Performance or Outdoors Status */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">
                  {hasModule('media') ? 'Status dos Outdoors' : 'Performance por Categoria'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasModule('media') ? 'Distribuição por status' : 'Média de todas as lojas'}
                </p>
              </div>
            </div>
            
            {hasModule('media') ? (
              <div className="space-y-4">
                {[
                  { label: 'Operacionais', count: stats?.operationalOutdoors || 0, status: 'operational' },
                  { label: 'Não Operacionais', count: stats?.nonOperationalOutdoors || 0, status: 'non_operational' },
                  { label: 'Aguardando Avaliação', count: stats?.pendingEvaluations || 0, status: 'pending_evaluation' },
                ].map((item, index) => (
                  <div key={item.label} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
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
            ) : (
              <div className="space-y-4">
                {categoryAvg.map((cat, index) => (
                  <div key={cat.name} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      <span className={`text-sm font-bold ${
                        cat.score >= 90 ? 'text-success' : 
                        cat.score >= 75 ? 'text-emerald-500' :
                        cat.score >= 60 ? 'text-warning' : 
                        'text-destructive'
                      }`}>
                        {cat.score}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          cat.score >= 90 ? 'bg-success' : 
                          cat.score >= 75 ? 'bg-emerald-500' :
                          cat.score >= 60 ? 'bg-warning' : 
                          'bg-destructive'
                        }`}
                        style={{ width: `${cat.score}%`, transitionDelay: `${index * 100}ms` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Evolution Chart + Alerts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {evolutionData.length > 0 && (
            <EvolutionChart data={evolutionData} title="Evolução dos Últimos 6 Meses" />
          )}
          
          <div className="space-y-6">
            {hasModule('merchandising') && criticalItems.length > 0 && (
              <CriticalItemsCard items={criticalItems} />
            )}
            
            {hasModule('media') && expiringContracts.length > 0 && (
              <ContractAlertsCard contracts={expiringContracts} />
            )}
          </div>
        </div>

        {/* PDVs List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-lg">Seus PDVs</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pdvs')}>
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pdvs.slice(0, 6).map((pdv, index) => (
              <div 
                key={pdv.id} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PDVCard 
                  pdv={{
                    id: pdv.id,
                    code: pdv.code,
                    name: pdv.name,
                    type: pdv.type as 'posto' | 'conveniencia' | 'both',
                    address: pdv.address,
                    city: pdv.city,
                    state: pdv.state,
                    activeModules: pdv.active_modules as ('media' | 'merchandising')[],
                    status: pdv.status as 'active' | 'inactive',
                    lastMerchScore: pdv.lastMerchScore || undefined,
                    lastMerchEvaluation: pdv.lastMerchEvaluation || undefined,
                    totalOutdoors: pdv.totalOutdoors,
                    operationalOutdoors: pdv.operationalOutdoors,
                  }} 
                  onClick={() => navigate(`/pdv/${pdv.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
