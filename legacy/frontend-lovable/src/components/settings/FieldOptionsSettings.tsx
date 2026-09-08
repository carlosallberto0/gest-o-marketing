import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  Settings2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  useSystemOptionsCategories,
  useAllSystemOptions,
  useCreateSystemOption,
  useUpdateSystemOption,
  useDeleteSystemOption,
  CATEGORY_LABELS,
  type SystemOption,
} from '@/hooks/useSystemOptions';

interface OptionFormData {
  option_key: string;
  option_label: string;
}

export function FieldOptionsSettings() {
  const { data: categories, isLoading: loadingCategories } = useSystemOptionsCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingOption, setEditingOption] = useState<SystemOption | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState<SystemOption | null>(null);
  const [formData, setFormData] = useState<OptionFormData>({ option_key: '', option_label: '' });

  const createOption = useCreateSystemOption();
  const updateOption = useUpdateSystemOption();
  const deleteOption = useDeleteSystemOption();

  const handleOpenNew = (category: string) => {
    setSelectedCategory(category);
    setEditingOption(null);
    setFormData({ option_key: '', option_label: '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (option: SystemOption) => {
    setSelectedCategory(option.category);
    setEditingOption(option);
    setFormData({ option_key: option.option_key, option_label: option.option_label });
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = (option: SystemOption) => {
    setOptionToDelete(option);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCategory) return;

    if (editingOption) {
      await updateOption.mutateAsync({
        id: editingOption.id,
        category: selectedCategory,
        option_key: formData.option_key,
        option_label: formData.option_label,
      });
    } else {
      await createOption.mutateAsync({
        category: selectedCategory,
        option_key: formData.option_key,
        option_label: formData.option_label,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!optionToDelete) return;
    await deleteOption.mutateAsync({
      id: optionToDelete.id,
      category: optionToDelete.category,
    });
    setIsDeleteDialogOpen(false);
    setOptionToDelete(null);
  };

  const handleToggleActive = async (option: SystemOption) => {
    await updateOption.mutateAsync({
      id: option.id,
      category: option.category,
      is_active: !option.is_active,
    });
  };

  if (loadingCategories) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Configuração de Campos
          </CardTitle>
          <CardDescription>
            Adicione, edite ou remova opções dos campos de seleção do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {categories?.map((category) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="text-left">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <CategoryOptions
                    category={category}
                    onAdd={() => handleOpenNew(category)}
                    onEdit={handleOpenEdit}
                    onDelete={handleConfirmDelete}
                    onToggleActive={handleToggleActive}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Dialog para criar/editar opção */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? 'Editar Opção' : 'Nova Opção'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="option_label">Nome de Exibição</Label>
              <Input
                id="option_label"
                value={formData.option_label}
                onChange={(e) => setFormData({ ...formData, option_label: e.target.value })}
                placeholder="Ex: Etanol/Gasolina"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="option_key">Chave (identificador único)</Label>
              <Input
                id="option_key"
                value={formData.option_key}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  option_key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                })}
                placeholder="Ex: etanol_gasolina"
                disabled={!!editingOption}
              />
              <p className="text-xs text-muted-foreground">
                Use apenas letras minúsculas, números e underscore
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.option_key || !formData.option_label || createOption.isPending || updateOption.isPending}
            >
              {(createOption.isPending || updateOption.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir opção?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a opção "{optionToDelete?.option_label}"?
              Esta ação não pode ser desfeita. Registros existentes que usam esta opção podem ser afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOption.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Componente interno para opções de uma categoria
function CategoryOptions({
  category,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  category: string;
  onAdd: () => void;
  onEdit: (option: SystemOption) => void;
  onDelete: (option: SystemOption) => void;
  onToggleActive: (option: SystemOption) => void;
}) {
  const { data: options, isLoading } = useAllSystemOptions(category);

  if (isLoading) {
    return (
      <div className="py-4 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2">
      {options?.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma opção cadastrada
        </p>
      ) : (
        <div className="space-y-1">
          {options?.map((option) => (
            <div
              key={option.id}
              className={`flex items-center gap-2 p-2 rounded-md border ${
                option.is_active 
                  ? 'bg-background border-border' 
                  : 'bg-muted/50 border-border/50 opacity-60'
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <span className="flex-1 text-sm">{option.option_label}</span>
              <Badge variant="outline" className="text-xs font-mono">
                {option.option_key}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onToggleActive(option)}
                title={option.is_active ? 'Desativar' : 'Ativar'}
              >
                {option.is_active ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(option)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(option)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" className="w-full mt-2" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Opção
      </Button>
    </div>
  );
}
