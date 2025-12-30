import { useState } from 'react';
import { useChecklistCategories } from '@/hooks/useChecklistData';
import {
  useCreateChecklistQuestion,
  useUpdateChecklistQuestion,
  useDeleteChecklistQuestion,
  ChecklistQuestionInput,
} from '@/hooks/useChecklistManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  Camera, 
  MessageSquare,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChecklistQuestion } from '@/types';
import { Database } from '@/integrations/supabase/types';

type MaterialType = Database['public']['Enums']['material_type'];

const materialTypes: { value: MaterialType; label: string }[] = [
  { value: 'promotional', label: 'Promocional' },
  { value: 'printed', label: 'Impresso' },
  { value: 'gift', label: 'Brinde' },
  { value: 'sample', label: 'Amostra' },
  { value: 'display', label: 'Display' },
  { value: 'signage', label: 'Sinalização' },
  { value: 'sticker', label: 'Adesivo' },
  { value: 'banner', label: 'Banner' },
  { value: 'poster', label: 'Pôster' },
  { value: 'flyer', label: 'Flyer' },
];

interface QuestionFormData {
  text: string;
  tip: string;
  requires_photo: boolean;
  requires_comment: boolean;
  is_critical: boolean;
  requires_material: boolean;
  material_type: MaterialType | null;
}

const defaultFormData: QuestionFormData = {
  text: '',
  tip: '',
  requires_photo: false,
  requires_comment: false,
  is_critical: false,
  requires_material: false,
  material_type: null,
};

export function ChecklistSettingsManager() {
  const { data: categories = [], isLoading } = useChecklistCategories();
  const createQuestion = useCreateChecklistQuestion();
  const updateQuestion = useUpdateChecklistQuestion();
  const deleteQuestion = useDeleteChecklistQuestion();

  const [newQuestionDialog, setNewQuestionDialog] = useState<{ open: boolean; categoryId: string | null }>({
    open: false,
    categoryId: null,
  });
  const [editingQuestion, setEditingQuestion] = useState<ChecklistQuestion | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(defaultFormData);

  const openNewQuestionDialog = (categoryId: string) => {
    setFormData(defaultFormData);
    setNewQuestionDialog({ open: true, categoryId });
  };

  const openEditDialog = (question: ChecklistQuestion) => {
    setFormData({
      text: question.text,
      tip: question.tip || '',
      requires_photo: question.requiresPhoto,
      requires_comment: question.requiresComment || false,
      is_critical: question.isCritical,
      requires_material: question.requiresMaterial,
      material_type: (question.materialType as MaterialType) || null,
    });
    setEditingQuestion(question);
  };

  const handleCreateQuestion = async () => {
    if (!newQuestionDialog.categoryId || !formData.text.trim()) return;

    await createQuestion.mutateAsync({
      category_id: newQuestionDialog.categoryId,
      text: formData.text.trim(),
      tip: formData.tip.trim() || null,
      requires_photo: formData.requires_photo,
      requires_comment: formData.requires_comment,
      is_critical: formData.is_critical,
      requires_material: formData.requires_material,
      material_type: formData.requires_material ? formData.material_type : null,
    });

    setNewQuestionDialog({ open: false, categoryId: null });
    setFormData(defaultFormData);
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion || !formData.text.trim()) return;

    await updateQuestion.mutateAsync({
      id: editingQuestion.id,
      text: formData.text.trim(),
      tip: formData.tip.trim() || null,
      requires_photo: formData.requires_photo,
      requires_comment: formData.requires_comment,
      is_critical: formData.is_critical,
      requires_material: formData.requires_material,
      material_type: formData.requires_material ? formData.material_type : null,
    });

    setEditingQuestion(null);
    setFormData(defaultFormData);
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteQuestion.mutateAsync(id);
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Checklist</CardTitle>
          <CardDescription>
            Gerencie as categorias e perguntas do checklist de merchandising.
            Você pode editar textos, configurar obrigatoriedades e adicionar novas perguntas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {categories.map((category) => (
              <AccordionItem 
                key={category.id} 
                value={category.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary">
                      {category.questions.length} perguntas
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-3">
                  {category.questions.map((question, index) => (
                    <div 
                      key={question.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{question.text}</p>
                        {question.tip && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Dica: {question.tip}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {question.isCritical && (
                            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Crítico
                            </Badge>
                          )}
                          {question.requiresPhoto && (
                            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                              <Camera className="h-3 w-3 mr-1" />
                              Foto obrigatória
                            </Badge>
                          )}
                          {question.requiresComment && (
                            <Badge variant="outline" className="text-secondary-foreground border-secondary bg-secondary/50">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Comentário obrigatório
                            </Badge>
                          )}
                          {question.requiresMaterial && (
                            <Badge variant="outline">
                              Material: {question.materialType}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(question)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(question.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => openNewQuestionDialog(category.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Pergunta
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* New Question Dialog */}
      <Dialog open={newQuestionDialog.open} onOpenChange={(open) => setNewQuestionDialog({ open, categoryId: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Pergunta</DialogTitle>
            <DialogDescription>
              Adicione uma nova pergunta ao checklist.
            </DialogDescription>
          </DialogHeader>
          <QuestionForm 
            formData={formData} 
            setFormData={setFormData}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewQuestionDialog({ open: false, categoryId: null })}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateQuestion} 
              disabled={!formData.text.trim() || createQuestion.isPending}
            >
              {createQuestion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Pergunta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Pergunta</DialogTitle>
            <DialogDescription>
              Modifique os detalhes da pergunta.
            </DialogDescription>
          </DialogHeader>
          <QuestionForm 
            formData={formData} 
            setFormData={setFormData}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateQuestion} 
              disabled={!formData.text.trim() || updateQuestion.isPending}
            >
              {updateQuestion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A pergunta será removida permanentemente do checklist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteQuestion(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteQuestion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface QuestionFormProps {
  formData: QuestionFormData;
  setFormData: React.Dispatch<React.SetStateAction<QuestionFormData>>;
}

function QuestionForm({ formData, setFormData }: QuestionFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="question-text">Texto da Pergunta *</Label>
        <Textarea
          id="question-text"
          placeholder="Digite a pergunta..."
          value={formData.text}
          onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="question-tip">Dica (opcional)</Label>
        <Input
          id="question-tip"
          placeholder="Dica para ajudar na resposta..."
          value={formData.tip}
          onChange={(e) => setFormData(prev => ({ ...prev, tip: e.target.value }))}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="requires-photo">Foto obrigatória</Label>
            <p className="text-xs text-muted-foreground">
              O avaliador deve anexar uma foto para esta pergunta
            </p>
          </div>
          <Switch
            id="requires-photo"
            checked={formData.requires_photo}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_photo: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="requires-comment">Comentário obrigatório</Label>
            <p className="text-xs text-muted-foreground">
              O avaliador deve adicionar uma observação para esta pergunta
            </p>
          </div>
          <Switch
            id="requires-comment"
            checked={formData.requires_comment}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_comment: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="is-critical">Item crítico</Label>
            <p className="text-xs text-muted-foreground">
              Destaca a pergunta como um item crítico de avaliação
            </p>
          </div>
          <Switch
            id="is-critical"
            checked={formData.is_critical}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_critical: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="requires-material">Requer material</Label>
            <p className="text-xs text-muted-foreground">
              A pergunta está relacionada a um tipo de material
            </p>
          </div>
          <Switch
            id="requires-material"
            checked={formData.requires_material}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_material: checked }))}
          />
        </div>

        {formData.requires_material && (
          <div className="pl-4 border-l-2 border-primary/20">
            <Label htmlFor="material-type">Tipo de Material</Label>
            <Select
              value={formData.material_type || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, material_type: value as MaterialType }))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {materialTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
