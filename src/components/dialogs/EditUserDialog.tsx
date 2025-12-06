import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { useUpdateProfile, Profile } from '@/hooks/useProfiles';

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'director', 'manager', 'collaborator', 'supplier']),
  modules: z.array(z.enum(['media', 'merchandising'])).min(1, 'Selecione pelo menos um módulo'),
  pdv_id: z.string().nullable(),
  status: z.enum(['active', 'pending', 'inactive']),
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
    },
  });

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
      });
    }
  }, [user, form]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    await updateProfile.mutateAsync({
      id: user.id,
      name: data.name,
      cpf: data.cpf || null,
      role: data.role,
      modules: data.modules as ('media' | 'merchandising')[],
      pdv_id: data.pdv_id,
      status: data.status,
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
  ];

  const statuses = [
    { value: 'active', label: 'Ativo' },
    { value: 'pending', label: 'Pendente' },
    { value: 'inactive', label: 'Inativo' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
