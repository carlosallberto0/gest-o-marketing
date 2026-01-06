import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Link2, 
  Search, 
  Users, 
  Clock, 
  Shield,
  ExternalLink,
  Copy,
  RefreshCw,
  Ban,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useAccessLinks, 
  AccessLinkUser,
  getAccessLinkStatus,
  formatExpirationDate,
  formatLastAccess,
  generateWhatsAppLink,
} from '@/hooks/useAccessLinks';
import { AccessLinkDialog } from '@/components/dialogs/AccessLinkDialog';
import { getPublicAppUrl } from '@/hooks/usePublicAppUrl';

export default function AccessControl() {
  const { 
    users, 
    isLoadingUsers, 
    generateLink, 
    revokeLink,
    accessLogs,
    isLoadingLogs,
  } = useAccessLinks();
  
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AccessLinkUser | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (user: AccessLinkUser) => {
    setSelectedUser(user);
    setGeneratedLink(null);
    setDialogOpen(true);
  };

  const handleGenerateLink = async () => {
    if (!selectedUser) return;
    
    const result = await generateLink.mutateAsync({ 
      userId: selectedUser.id,
      validityDays: 365,
    });
    
    if (result.accessLink) {
      setGeneratedLink(result.accessLink);
    }
  };

  const handleRevokeLink = async () => {
    if (!selectedUser) return;
    
    await revokeLink.mutateAsync(selectedUser.id);
    setDialogOpen(false);
  };

  const handleQuickCopy = async (user: AccessLinkUser) => {
    if (!user.access_token) return;
    // SEMPRE usar a URL pública canônica, nunca window.location.origin
    const publicUrl = getPublicAppUrl();
    const link = `${publicUrl}/acesso/${user.access_token}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handleQuickWhatsApp = (user: AccessLinkUser) => {
    if (!user.access_token) return;
    // SEMPRE usar a URL pública canônica, nunca window.location.origin
    const publicUrl = getPublicAppUrl();
    const link = `${publicUrl}/acesso/${user.access_token}`;
    window.open(generateWhatsAppLink(link, user.name), '_blank');
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      admin: 'Admin',
      director: 'Diretor',
      manager: 'Gerente',
      collaborator: 'Colaborador',
      supplier: 'Fornecedor',
      coordenador_compras: 'Coord. Compras',
      convenience_coordinator: 'Coord. Conv.',
    };
    return roleNames[role] || role;
  };

  const getStatusBadge = (user: AccessLinkUser) => {
    const status = getAccessLinkStatus(user);
    return (
      <Badge 
        variant={status.status === 'active' ? 'default' : 'secondary'}
        className={
          status.status === 'active' ? 'bg-emerald-500' :
          status.status === 'expired' ? 'bg-destructive' :
          status.status === 'pending' ? 'bg-amber-500' :
          ''
        }
      >
        {status.label}
      </Badge>
    );
  };

  // Stats
  const stats = {
    total: users.length,
    withLink: users.filter(u => u.access_token).length,
    active: users.filter(u => getAccessLinkStatus(u).status === 'active').length,
    expired: users.filter(u => getAccessLinkStatus(u).status === 'expired').length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6" />
            Controle de Acessos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie links de acesso pessoais para usuários do sistema
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Links Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                  <p className="text-xs text-muted-foreground">Expirados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Ban className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total - stats.withLink}</p>
                  <p className="text-xs text-muted-foreground">Sem Link</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="logs">Logs de Acesso</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciar Links de Acesso</CardTitle>
                    <CardDescription>
                      Clique em um usuário para gerenciar seu link de acesso
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Último Acesso</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow 
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleOpenDialog(user)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getRoleName(user.role)}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(user)}</TableCell>
                          <TableCell className="text-sm">
                            {formatExpirationDate(user.token_valido_ate)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatLastAccess(user.ultimo_acesso_via_link)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {user.access_token && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleQuickCopy(user)}
                                    title="Copiar link"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleQuickWhatsApp(user)}
                                    title="Enviar por WhatsApp"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenDialog(user)}
                                title="Gerenciar"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Acessos</CardTitle>
                <CardDescription>
                  Últimos 100 acessos realizados via link
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLogs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : accessLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum acesso registrado ainda
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Dispositivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {(log.profiles as { name: string; email: string } | null)?.name || 'Usuário removido'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(log.profiles as { name: string; email: string } | null)?.email || '-'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.tipo_acesso === 'link' ? 'default' : 'secondary'}>
                              {log.tipo_acesso === 'link' ? 'Link' : 'Login'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {log.ip_address || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {log.user_agent?.split(' ')[0] || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AccessLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        accessLink={generatedLink}
        isGenerating={generateLink.isPending}
        onGenerate={handleGenerateLink}
        onRevoke={handleRevokeLink}
      />
    </AppLayout>
  );
}
