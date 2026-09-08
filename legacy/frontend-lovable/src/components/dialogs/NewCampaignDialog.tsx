import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateCampaign } from '@/hooks/useCreateCampaign';
import type { Database } from '@/integrations/supabase/types';

type CampaignType = Database['public']['Enums']['campaign_type'];

interface NewCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const campaignTypes: { value: CampaignType; label: string }[] = [
  { value: 'promotional', label: 'Promocional' },
  { value: 'institutional', label: 'Institucional' },
  { value: 'seasonal', label: 'Sazonal' },
  { value: 'launch', label: 'Lançamento' },
  { value: 'partnership', label: 'Parceria' },
];

export function NewCampaignDialog({ open, onOpenChange }: NewCampaignDialogProps) {
  const createCampaign = useCreateCampaign();
  const [formData, setFormData] = useState({
    name: '',
    type: '' as CampaignType | '',
    description: '',
    startDate: '',
    endDate: '',
    targetScore: '85',
    targetCoverage: '90',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type) return;
    
    await createCampaign.mutateAsync({
      name: formData.name,
      type: formData.type as CampaignType,
      description: formData.description || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      targetScore: parseInt(formData.targetScore),
      targetCoverage: parseInt(formData.targetCoverage),
    });

    onOpenChange(false);
    setFormData({
      name: '',
      type: '',
      description: '',
      startDate: '',
      endDate: '',
      targetScore: '85',
      targetCoverage: '90',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Campanha</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={formData.type} onValueChange={(v: CampaignType) => setFormData({ ...formData, type: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {campaignTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome da campanha"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição da campanha"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetScore">Meta de Score (%)</Label>
              <Input
                id="targetScore"
                type="number"
                min="0"
                max="100"
                value={formData.targetScore}
                onChange={(e) => setFormData({ ...formData, targetScore: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetCoverage">Meta de Cobertura (%)</Label>
              <Input
                id="targetCoverage"
                type="number"
                min="0"
                max="100"
                value={formData.targetCoverage}
                onChange={(e) => setFormData({ ...formData, targetCoverage: e.target.value })}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            O código da campanha será gerado automaticamente no formato CAMP-XXXX
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createCampaign.isPending || !formData.type}>
              {createCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Campanha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
