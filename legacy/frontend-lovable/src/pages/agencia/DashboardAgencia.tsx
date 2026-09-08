import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ClipboardList, Video, Image, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAgencias, useAgenciaDemandas, useAgenciaVideos, useAgenciaFotos } from '@/hooks/useAgencias';

export default function DashboardAgencia() {
  const navigate = useNavigate();
  const { data: agencias = [] } = useAgencias();
  const { data: demandas = [] } = useAgenciaDemandas();
  const { data: videos = [] } = useAgenciaVideos();
  const { data: fotos = [] } = useAgenciaFotos();

  const agenciasAtivas = agencias.filter(a => a.ativo).length;
  const demandasPendentes = demandas.filter(d => d.status === 'pendente').length;
  const demandasEmProducao = demandas.filter(d => d.status === 'em_producao').length;

  const stats = [
    { 
      title: 'Agências Ativas', 
      value: agenciasAtivas, 
      icon: Building2, 
      color: 'bg-purple-500',
      description: `${agencias.length} total cadastradas`
    },
    { 
      title: 'Demandas Pendentes', 
      value: demandasPendentes, 
      icon: ClipboardList, 
      color: 'bg-amber-500',
      description: `${demandasEmProducao} em produção`
    },
    { 
      title: 'Vídeos Catalogados', 
      value: videos.length, 
      icon: Video, 
      color: 'bg-blue-500',
      description: 'Catálogo completo'
    },
    { 
      title: 'Álbuns de Fotos', 
      value: fotos.length, 
      icon: Image, 
      color: 'bg-emerald-500',
      description: 'Catálogo completo'
    },
  ];

  const recentDemandas = demandas.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Agência</h1>
          <p className="text-muted-foreground">Gerencie agências, demandas e catálogos de mídia</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/agencia/agencias')} variant="outline">
            <Building2 className="h-4 w-4 mr-2" />
            Ver Agências
          </Button>
          <Button onClick={() => navigate('/agencia/demandas')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Demanda
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Demands */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Demandas Recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/agencia/demandas')}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {recentDemandas.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhuma demanda cadastrada</p>
            ) : (
              <div className="space-y-3">
                {recentDemandas.map((demanda) => (
                  <div key={demanda.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{demanda.titulo}</p>
                      <p className="text-xs text-muted-foreground">{demanda.agencia?.nome || 'Sem agência'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      demanda.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
                      demanda.status === 'em_producao' ? 'bg-blue-100 text-blue-700' :
                      demanda.status === 'entregue' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {demanda.status === 'pendente' ? 'Pendente' :
                       demanda.status === 'em_producao' ? 'Em Produção' :
                       demanda.status === 'entregue' ? 'Entregue' :
                       demanda.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/agencia/agencias')}>
              <Building2 className="h-4 w-4 mr-3" />
              Gerenciar Agências
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/agencia/demandas')}>
              <ClipboardList className="h-4 w-4 mr-3" />
              Ver Demandas
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/agencia/videos')}>
              <Video className="h-4 w-4 mr-3" />
              Catálogo de Vídeos
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/agencia/fotos')}>
              <Image className="h-4 w-4 mr-3" />
              Catálogo de Fotos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
