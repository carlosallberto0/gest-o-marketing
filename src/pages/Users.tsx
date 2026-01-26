import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProfiles, useDeleteProfile, useReactivateProfile, usePermanentDeleteProfile, Profile } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { getRoleLabel } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  Mail,
  Shield,
  Filter,
  MoreVertical,
  Megaphone,
  ClipboardCheck,
  Trash2,
  Loader2,
  Pencil,
  UserCheck,
  UserX,
  Upload
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NewUserDialog } from '@/components/dialogs/NewUserDialog';
import { EditUserDialog } from '@/components/dialogs/EditUserDialog';
import { BulkUserImportDialog } from '@/components/dialogs/BulkUserImportDialog';

const getRoleColor = (role: string) => {
  switch (role) {
    case 'super_admin': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'admin': return 'bg-primary/10 text-primary border-primary/20';
    case 'director': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'manager': return 'bg-success/10 text-success border-success/20';
    case 'collaborator': return 'bg-secondary text-secondary-foreground';
    case 'supplier': return 'bg-warning/10 text-warning border-warning/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-success/10 text-success';
    case 'pending': return 'bg-warning/10 text-warning';
    case 'inactive': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Ativo';
    case 'pending': return 'Pendente';
    case 'inactive': return 'Inativo';
    default: return status;
  }
};

// Content component for reuse in different layouts
export function UsersContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { profile } = useAuth();

  const { data: users = [], isLoading } = useProfiles();
  const { mutate: deactivateProfile } = useDeleteProfile();
  const { mutate: reactivateProfile, isPending: isReactivating } = useReactivateProfile();
  const { mutate: permanentDeleteProfile, isPending: isPermanentDeleting } = usePermanentDeleteProfile();

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => ['super_admin', 'admin'].includes(u.role)).length,
    managers: users.filter(u => u.role === 'manager').length,
  };

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'director', label: 'Diretoria' },
    { value: 'manager', label: 'Gerente' },
    { value: 'collaborator', label: 'Colaborador' },
    { value: 'supplier', label: 'Fornecedor' },
  ];

  const handlePermanentDelete = () => {
    if (deleteUserId) {
      permanentDeleteProfile(deleteUserId);
      setDeleteUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground mt-1">Gestão de usuários do sistema</p>
          </div>
          <div className="flex gap-2">
            {['super_admin', 'admin'].includes(profile?.role || '') && (
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </Button>
            )}
            <Button onClick={() => setIsNewUserOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Ativos</p>
            <p className="text-2xl font-bold text-success">{stats.active}</p>
          </div>
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <p className="text-sm text-primary">Admins</p>
            <p className="text-2xl font-bold text-primary">{stats.admins}</p>
          </div>
          <div className="bg-secondary rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Gerentes</p>
            <p className="text-2xl font-bold text-foreground">{stats.managers}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Shield className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos perfis</SelectItem>
              {roles.map(role => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>PDV</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, index) => (
                <TableRow 
                  key={user.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.modules.includes('media') && (
                        <Badge variant="outline" className="text-xs">
                          <Megaphone className="h-3 w-3 mr-1" />
                          Mídia
                        </Badge>
                      )}
                      {user.modules.includes('merchandising') && (
                        <Badge variant="outline" className="text-xs">
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          Merch
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.pdv_name ? (
                      <span className="text-sm">{user.pdv_name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(user.status)}>
                      {getStatusLabel(user.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {user.status === 'inactive' ? (
                          <DropdownMenuItem
                            onClick={() => reactivateProfile(user.id)}
                            disabled={isReactivating}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Reativar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-warning"
                            onClick={() => deactivateProfile(user.id)}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Desativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeleteUserId(user.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir permanentemente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhum usuário encontrado</p>
          </div>
        )}

        <NewUserDialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen} />
        <EditUserDialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)} user={editUser} />
        <BulkUserImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handlePermanentDelete}
                disabled={isPermanentDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isPermanentDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}

// Default export with AppLayout wrapper
export default function Users() {
  return (
    <AppLayout>
      <UsersContent />
    </AppLayout>
  );
}
