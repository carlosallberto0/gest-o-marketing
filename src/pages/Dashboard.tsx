import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScoreCard } from '@/components/dashboard/ScoreCard';
import { StoreCard } from '@/components/dashboard/StoreCard';
import { mockStores, mockCategories, mockEvaluations, getScoreBgColor } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Store, 
  ClipboardCheck, 
  AlertTriangle,
  Calendar,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const avgScore = Math.round(mockStores.reduce((acc, s) => acc + (s.lastScore || 0), 0) / mockStores.length);
  const criticalStores = mockStores.filter(s => (s.lastScore || 0) < 70).length;
  const totalEvaluations = mockEvaluations.length;

  const chartData = mockStores.map(store => ({
    name: store.name.replace('Loja ', ''),
    score: store.lastScore || 0,
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
              Acompanhe o desempenho das suas lojas em tempo real
            </p>
          </div>
          <Button onClick={() => navigate('/checklist')} size="lg">
            <ClipboardCheck className="h-5 w-5 mr-2" />
            Nova Avaliação
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard 
            title="Score Médio" 
            score={avgScore} 
            subtitle="Todas as lojas"
            trend={3}
            icon={<TrendingUp className="h-5 w-5 text-white" />}
          />
          <ScoreCard 
            title="Lojas Ativas" 
            score={mockStores.length} 
            subtitle={`${criticalStores} precisam atenção`}
            icon={<Store className="h-5 w-5 text-white" />}
            className="[&>div>div:first-child>div:last-child]:hidden"
          />
          <ScoreCard 
            title="Avaliações" 
            score={totalEvaluations} 
            subtitle="Este mês"
            icon={<ClipboardCheck className="h-5 w-5 text-white" />}
            className="[&>div>div:first-child>div:last-child]:hidden"
          />
          <div className="bg-destructive/10 rounded-xl p-5 border border-destructive/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">Atenção Necessária</p>
                <p className="text-3xl font-bold text-destructive mt-2">{criticalStores}</p>
                <p className="text-xs text-destructive/70 mt-1">Lojas abaixo de 70%</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-destructive flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Stores Performance Chart */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Performance por Loja</h3>
                <p className="text-sm text-muted-foreground">Score atual de cada loja</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Score']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
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

          {/* Category Performance */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Performance por Categoria</h3>
                <p className="text-sm text-muted-foreground">Média de todas as lojas</p>
              </div>
            </div>
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
          </div>
        </div>

        {/* Stores List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-lg">Suas Lojas</h3>
            <Button variant="ghost" size="sm">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockStores.slice(0, 6).map((store, index) => (
              <div 
                key={store.id} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <StoreCard 
                  store={store} 
                  onClick={() => navigate(`/checklist?store=${store.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
