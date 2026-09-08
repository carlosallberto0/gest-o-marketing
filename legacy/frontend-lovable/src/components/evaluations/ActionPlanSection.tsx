import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Plus, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useActionPlans,
  useNonCompliantItems,
  useCreateActionPlan,
  useUpdateActionPlan,
  useDeleteActionPlan,
} from '@/hooks/useActionPlans';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';

interface ActionPlanSectionProps {
  evaluationId: string;
}

export function ActionPlanSection({ evaluationId }: ActionPlanSectionProps) {
  const { user, profile } = useAuth();
  const { data: actionPlans = [], isLoading: plansLoading } = useActionPlans(evaluationId);
  const { data: nonCompliantItems = [], isLoading: itemsLoading } = useNonCompliantItems(evaluationId);
  const { data: profiles = [] } = useProfiles();
  const createPlan = useCreateActionPlan();
  const updatePlan = useUpdateActionPlan();
  const deletePlan = useDeleteActionPlan();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');

  const canManage = profile?.role && ['super_admin', 'admin', 'director', 'manager'].includes(profile.role);

  // Filter out items that already have action plans
  const itemsWithoutPlans = nonCompliantItems.filter(
    item => !actionPlans.some(plan => plan.answer_id === item.answer_id)
  );

  const handleCreatePlan = async () => {
    if (!selectedItem || !description || !dueDate) return;

    await createPlan.mutateAsync({
      evaluation_id: evaluationId,
      answer_id: selectedItem,
      description,
      responsible_id: responsibleId || null,
      due_date: dueDate,
    });

    setIsDialogOpen(false);
    setSelectedItem(null);
    setDescription('');
    setResponsibleId('');
    setDueDate('');
  };

  const handleStatusChange = async (planId: string, newStatus: string) => {
    await updatePlan.mutateAsync({
      id: planId,
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Em Andamento</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Pendente</Badge>;
    }
  };

  const getItemForPlan = (answerId: string) => {
    return nonCompliantItems.find(item => item.answer_id === answerId);
  };

  if (plansLoading || itemsLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold">Plano de Ação</h3>
          <Badge variant="outline">{nonCompliantItems.length} itens não conformes</Badge>
        </div>

        {canManage && itemsWithoutPlans.length > 0 && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Criar Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Plano de Ação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Item não conforme</Label>
                  <Select value={selectedItem || ''} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o item" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemsWithoutPlans.map(item => (
                        <SelectItem key={item.answer_id} value={item.answer_id}>
                          <span className="text-xs text-muted-foreground">[{item.category_name}]</span>{' '}
                          {item.question_text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Descrição da ação</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva as ações a serem tomadas..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={responsibleId} onValueChange={setResponsibleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreatePlan}
                  disabled={!selectedItem || !description || !dueDate || createPlan.isPending}
                >
                  {createPlan.isPending ? 'Criando...' : 'Criar Plano de Ação'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {actionPlans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum plano de ação criado para esta avaliação.
        </p>
      ) : (
        <div className="space-y-3">
          {actionPlans.map(plan => {
            const item = getItemForPlan(plan.answer_id);
            return (
              <div key={plan.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      [{item?.category_name}] {item?.question_text}
                    </p>
                    <p className="mt-1">{plan.description}</p>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Prazo: {format(new Date(plan.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                  {plan.responsible?.name && (
                    <div>Responsável: {plan.responsible.name}</div>
                  )}
                </div>

                {canManage && (
                  <div className="flex items-center gap-2 pt-2">
                    <Select
                      value={plan.status}
                      onValueChange={(value) => handleStatusChange(plan.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deletePlan.mutate(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
