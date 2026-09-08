import { Card, CardContent } from '@/components/ui/card';
import { Cog, Users, Building2, Shield, TrendingUp, UserCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useProfiles } from '@/hooks/useProfiles';
import { useSuppliers } from '@/hooks/useSuppliers';

export default function DashboardConfiguracoes() {
  const navigate = useNavigate();
  const { data: users = [] } = useProfiles();
  const { data: suppliers = [] } = useSuppliers();

  const activeUsers = users.filter(u => u.status === 'active').length;
  const pendingUsers = users.filter(u => u.status === 'pending').length;
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;

  const stats = [
    { 
      title: 'Usuários Ativos', 
      value: activeUsers, 
      icon: UserCheck, 
      color: 'bg-emerald-500',
      description: `${users.length} total cadastrados`
    },
    { 
      title: 'Usuários Pendentes', 
      value: pendingUsers, 
      icon: AlertTriangle, 
      color: 'bg-amber-500',
      description: 'Aguardando aprovação'
    },
    { 
      title: 'Fornecedores', 
      value: activeSuppliers, 
      icon: Building2, 
      color: 'bg-blue-500',
      description: `${suppliers.length} total cadastrados`
    },
    { 
      title: 'Sistema', 
      value: '✓', 
      icon: TrendingUp, 
      color: 'bg-purple-500',
      description: 'Operacional'
    },
  ];

  const menuItems = [
    { icon: Cog, label: 'Configurações Gerais', description: 'Marca, aparência, notificações e parâmetros do sistema', path: '/configuracoes/geral' },
    { icon: Users, label: 'Gestão de Usuários', description: 'Criar, editar e gerenciar usuários do sistema', path: '/configuracoes/usuarios' },
    { icon: Building2, label: 'Fornecedores', description: 'Cadastro e gestão de fornecedores', path: '/configuracoes/fornecedores' },
    { icon: Shield, label: 'Controle de Acessos', description: 'Links de acesso e permissões de usuários', path: '/configuracoes/perfis' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard de Configurações</h1>
        <p className="text-muted-foreground">Centralize todas as configurações do sistema</p>
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

      {/* Navigation Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {menuItems.map((item, i) => (
            <Card 
              key={i} 
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/50 hover:border-l-primary"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{item.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="mt-1">
                    Acessar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
