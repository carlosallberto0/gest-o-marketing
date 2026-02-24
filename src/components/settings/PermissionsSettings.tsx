import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { showToast } from '@/lib/toast';

const ROLES = [
  { key: 'director', label: 'Diretor' },
  { key: 'manager', label: 'Gerente' },
  { key: 'coordenador_compras', label: 'Coord. Compras' },
  { key: 'collaborator', label: 'Colaborador' },
  { key: 'supplier', label: 'Fornecedor' },
];

const MODULES = [
  { key: 'media', label: 'Mídia Externa' },
  { key: 'merchandising', label: 'Merchandising' },
  { key: 'financeiro', label: 'Financeiro' },
];

const PERMISSIONS = [
  { key: 'create', label: 'Criar' },
  { key: 'read', label: 'Visualizar' },
  { key: 'update', label: 'Editar' },
  { key: 'delete', label: 'Excluir' },
  { key: 'approve', label: 'Aprovar' },
];

export function PermissionsSettings() {
  const { permissions, isLoading, upsertPermission } = useRolePermissions();

  const getPermissionState = (role: string, moduleKey: string, permissionKey: string): boolean => {
    const perm = permissions.find(
      p => p.role === role && p.module_key === moduleKey && p.permission_key === permissionKey && p.entity_key === '*'
    );
    return perm ? perm.granted : true; // default: true (compatibilidade)
  };

  const handleToggle = async (role: string, moduleKey: string, permissionKey: string) => {
    const current = getPermissionState(role, moduleKey, permissionKey);
    try {
      await upsertPermission.mutateAsync({
        role,
        moduleKey,
        permissionKey,
        granted: !current,
      });
      showToast.success('Permissão atualizada');
    } catch {
      showToast.error('Erro ao atualizar permissão');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {MODULES.map((mod) => (
        <Card key={mod.key}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {mod.label}
            </CardTitle>
            <CardDescription>
              Defina as permissões de cada perfil para o módulo {mod.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-medium text-muted-foreground">Perfil</th>
                    {PERMISSIONS.map((perm) => (
                      <th key={perm.key} className="text-center p-2 font-medium text-muted-foreground">
                        {perm.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role.key} className="border-b border-border/50">
                      <td className="p-2 font-medium">{role.label}</td>
                      {PERMISSIONS.map((perm) => (
                        <td key={perm.key} className="text-center p-2">
                          <Checkbox
                            checked={getPermissionState(role.key, mod.key, perm.key)}
                            onCheckedChange={() => handleToggle(role.key, mod.key, perm.key)}
                            disabled={upsertPermission.isPending}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Super Admin tem todas as permissões automaticamente e não aparece nesta lista.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
