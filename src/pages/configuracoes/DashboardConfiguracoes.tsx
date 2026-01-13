import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, Building2, Shield, Cog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function DashboardConfiguracoes() {
  const navigate = useNavigate();

  const menuItems = [
    { icon: Cog, label: 'Configurações Gerais', description: 'Parâmetros básicos do sistema', path: '/configuracoes/geral' },
    { icon: Users, label: 'Gestão de Usuários', description: 'Criar, editar e gerenciar usuários', path: '/configuracoes/usuarios' },
    { icon: Building2, label: 'Fornecedores', description: 'Cadastro de fornecedores', path: '/configuracoes/fornecedores' },
    { icon: Shield, label: 'Perfis e Permissões', description: 'Controle de acesso granular', path: '/configuracoes/perfis' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard de Configurações</h1>
        <p className="text-muted-foreground">Centralize todas as configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {menuItems.map((item, i) => (
          <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(item.path)}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
