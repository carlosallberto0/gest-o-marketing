import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { usePDVs } from '@/hooks/usePDVs';
import { useUpdateProfile, Profile, UserRole, useResetPassword } from '@/hooks/useProfiles';

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'director', 'manager', 'collaborator', 'supplier', 'coordenador_compras', 'convenience_coordinator']),
  modules: z.array(z.enum(['media', 'merchandising'])).min(1, 'Selecione pelo menos um módulo'),
  pdv_id: z.string().nullable(),
  status: z.enum(['active', 'pending', 'inactive']),
  pode_aprovar_os: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Profile | null;
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const { data: pdvs = [] } = usePDVs();
  const updateProfile = useUpdateProfile();
  const resetPassword = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      cpf: '',
      role: 'collaborator',
      modules: ['merchandising'],
      pdv_id: null,
      status: 'active',
      pode_aprovar_os: false,
    },
  });

  const selectedRole = form.watch('role');

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        cpf: user.cpf || '',
        role: user.role,
        modules: user.modules,
        pdv_id: user.pdv_id,
        status: user.status as 'active' | 'pending' | 'inactive',
        pode_aprovar_os: user.pode_aprovar_os ?? false,
      });
    }
  }, [user, form]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    await updateProfile.mutateAsync({
      id: user.id,
      name: data.name,
      cpf: data.cpf || null,
      role: data.role as UserRole,
      modules: data.modules as ('media' | 'merchandising')[],
      pdv_id: data.pdv_id,
      status: data.status,
      pode_aprovar_os: data.role === 'director' ? data.pode_aprovar_os : false,
    });

    onOpenChange(false);
  };

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'director', label: 'Diretoria' },
    { value: 'manager', label: 'Gerente' },
    { value: 'collaborator', label: 'Colaborador' },
    { value: 'supplier', label: 'Fornecedor' },
    { value: 'coordenador_compras', label: 'Coordenador de Compras' },
    { value: 'convenience_coordinator', label: 'Coordenador de Conveniência' },
  ];

  const statuses = [
    { value: 'active', label: 'Ativo' },
    { value: 'pending', label: 'Pendente' },
    { value: 'inactive', label: 'Inativo' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="000.000.000-00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Seção de Senha Temporária */}
            {user?.temp_password && (
              <div className="rounded-md border p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <FormLabel className="text-amber-700 dark:text-amber-400 mb-2 block">
                  Senha Temporária
                </FormLabel>
                <div className="flex items-center gap-2">
                  <Input 
                    value={showPassword ? user.temp_password : '••••••••••••'} 
                    readOnly 
                    className="font-mono bg-background"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(user.temp_password!);
                      showToast.success('Senha copiada!');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Botão Resetar Senha */}
            <Button 
              type="button" 
              variant="outline"
              className="w-full"
              onClick={() => {
                if (user) {
                  resetPassword.mutate(user.id);
                }
              }}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Resetar Senha
            </Button>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Checkbox para permissão de aprovar OS - só aparece para Diretores */}
            {selectedRole === 'director' && (
              <FormField
                control={form.control}
                name="pode_aprovar_os"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-medium">
                        Pode aprovar Ordens de Serviço
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Permite que este diretor aprove ordens de serviço de manutenção de outdoors
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modules"
              render={() => (
                <FormItem>
                  <FormLabel>Módulos de Acesso</FormLabel>
                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="modules"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes('merchandising')}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), 'merchandising']
                                  : field.value?.filter((v) => v !== 'merchandising') || [];
                                field.onChange(newValue);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Merchandising</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="modules"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes('media')}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), 'media']
                                  : field.value?.filter((v) => v !== 'media') || [];
                                field.onChange(newValue);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Mídia Externa</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pdv_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PDV Vinculado</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um PDV" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {pdvs.map((pdv) => (
                        <SelectItem key={pdv.id} value={pdv.id}>
                          {pdv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={updateProfile.isPending}>
                {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
