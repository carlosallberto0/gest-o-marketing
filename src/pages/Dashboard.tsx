import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard } from '@/components/dashboard/ScoreCard';
import { PDVCard } from '@/components/dashboard/StoreCard';
import { mockPDVs, mockCategories, mockMerchEvaluations, mockOutdoors, mockAlerts, getScoreBgColor, getStatusColor, getStatusLabel } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Fuel, 
  ClipboardCheck, 
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Megaphone,
  FileText,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { user, hasModule } = useAuth();
  const navigate = useNavigate();

  // Merchandising stats
  const pdvsWithMerch = mockPDVs.filter(p => p.activeModules.includes('merchandising'));
  const avgMerchScore = Math.round(
    pdvsWithMerch.reduce((acc, s) => acc + (s.lastMerchScore || 0), 0) / pdvsWithMerch.length
  );
  const criticalPDVs = pdvsWithMerch.filter(s => (s.lastMerchScore || 0) < 70).length;
  const totalMerchEvaluations = mockMerchEvaluations.length;

  // Media stats
  const totalOutdoors = mockOutdoors.length;
  const operationalOutdoors = mockOutdoors.filter(o => o.status === 'operational').length;
  const pendingEvaluations = mockOutdoors.filter(o => o.status === 'pending_evaluation').length;
  const operationalRate = Math.round((operationalOutdoors / totalOutdoors) * 100);

  // Alerts
  const relevantAlerts = mockAlerts.filter(a => {
    if (hasModule('media') && a.module === 'media') return true;
    if (hasModule('merchandising') && a.module === 'merchandising') return true;
    return false;
  });

  const merchChartData = pdvsWithMerch.map(pdv => ({
    name: pdv.name.replace('Posto ', '').replace('Conveniência ', '').substring(0, 12),
    score: pdv.lastMerchScore || 0,
  }));

  const categoryAvg = mockCategories.map(cat => ({
    name: cat.name.split(' ')[0],
    score: Math.round(Math.random() * 20 + 75),
  }));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Olá, {user?.name.split(' ')[0]}!
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

        {/* Alerts Banner */}
        {relevantAlerts.length > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {relevantAlerts.length} alertas pendentes
                </p>
                <p className="text-xs text-muted-foreground">
                  {relevantAlerts[0].title}
                </p>
              </div>
              <Button variant="ghost" size="sm">Ver todos</Button>
            </div>
          </div>
        )}

        {/* Module Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {hasModule('merchandising') && (
            <>
              <ScoreCard 
                title="Score Médio Merch" 
                score={avgMerchScore} 
                subtitle="Merchandising"
                trend={3}
                icon={<TrendingUp className="h-5 w-5 text-white" />}
              />
              <ScoreCard 
                title="Avaliações" 
                score={totalMerchEvaluations} 
                subtitle="Este mês"
                icon={<ClipboardCheck className="h-5 w-5 text-white" />}
                className="[&>div>div:first-child>div:last-child]:hidden"
              />
            </>
          )}
          
          {hasModule('media') && (
            <>
              <ScoreCard 
                title="Taxa Operacional" 
                score={operationalRate} 
                subtitle={`${operationalOutdoors}/${totalOutdoors} outdoors`}
                trend={-2}
                icon={<Megaphone className="h-5 w-5 text-white" />}
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
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Merchandising Chart */}
          {hasModule('merchandising') && (
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
                  { label: 'Operacionais', count: operationalOutdoors, status: 'operational' },
                  { label: 'Não Operacionais', count: mockOutdoors.filter(o => o.status === 'non_operational').length, status: 'non_operational' },
                  { label: 'Aguardando Avaliação', count: pendingEvaluations, status: 'pending_evaluation' },
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
                        style={{ width: `${(item.count / totalOutdoors) * 100}%`, transitionDelay: `${index * 100}ms` }}
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
            {mockPDVs.slice(0, 6).map((pdv, index) => (
              <div 
                key={pdv.id} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PDVCard 
                  pdv={pdv} 
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
