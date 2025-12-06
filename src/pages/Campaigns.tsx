import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCampaigns, useUpdateCampaignStatus } from '@/hooks/useCampaigns';
import { getCampaignTypeLabel, getCampaignStatusLabel, getCampaignStatusColor } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Search, 
  Plus, 
  Calendar,
  Store,
  Package,
  Filter,
  Eye,
  Play,
  Pause,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewCampaignDialog } from '@/components/dialogs/NewCampaignDialog';

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useCampaigns();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateCampaignStatus();

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    draft: campaigns.filter(c => c.status === 'draft').length,
    ended: campaigns.filter(c => c.status === 'ended').length,
  };

  const campaignTypes = [...new Set(campaigns.map(c => c.type))];

  const getCampaignProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    if (isFuture(start)) return 0;
    if (isPast(end)) return 100;
    
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    return Math.round((elapsed / total) * 100);
  };

  const handleActivate = (id: string) => {
    updateStatus({ id, status: 'active' });
  };

  const handlePause = (id: string) => {
    updateStatus({ id, status: 'draft' });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Campanhas</h1>
            <p className="text-muted-foreground mt-1">Gestão de campanhas de merchandising</p>
          </div>
          <Button onClick={() => setIsNewCampaignOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-success/10 rounded-xl p-4 border border-success/20">
            <p className="text-sm text-success">Ativas</p>
            <p className="text-2xl font-bold text-success">{stats.active}</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 border border-warning/20">
            <p className="text-sm text-warning">Rascunho</p>
            <p className="text-2xl font-bold text-warning">{stats.draft}</p>
          </div>
          <div className="bg-secondary rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Encerradas</p>
            <p className="text-2xl font-bold text-foreground">{stats.ended}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="ended">Encerradas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {campaignTypes.map(type => (
                <SelectItem key={type} value={type}>{getCampaignTypeLabel(type)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campaigns Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredCampaigns.map((campaign, index) => {
            const progress = getCampaignProgress(campaign.start_date, campaign.end_date);
            const daysRemaining = differenceInDays(new Date(campaign.end_date), new Date());
            
            return (
              <div 
                key={campaign.id}
                className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      campaign.status === 'active' ? "bg-success/10" : "bg-muted"
                    )}>
                      <Target className={cn(
                        "h-6 w-6",
                        campaign.status === 'active' ? "text-success" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                      <p className="text-xs text-muted-foreground">{campaign.code}</p>
                    </div>
                  </div>
                  <Badge className={getCampaignStatusColor(campaign.status)}>
                    {getCampaignStatusLabel(campaign.status)}
                  </Badge>
                </div>

                {campaign.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {campaign.description}
                  </p>
                )}

                <div className="space-y-3">
                  {/* Progress */}
                  {campaign.status === 'active' && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      {daysRemaining > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {daysRemaining} dias restantes
                        </p>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(campaign.start_date), 'dd/MM', { locale: ptBR })} - {format(new Date(campaign.end_date), 'dd/MM/yy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Store className="h-4 w-4" />
                      <span>{campaign.target_pdv_ids.length} PDVs</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{campaign.required_materials.length} materiais</span>
                    </div>
                  </div>

                  {/* Type & KPIs */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <Badge variant="outline">{getCampaignTypeLabel(campaign.type)}</Badge>
                    <div className="flex gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Meta: <span className="font-medium text-foreground">{campaign.kpi_targets.targetScore}%</span>
                      </span>
                      <span className="text-muted-foreground">
                        Cobertura: <span className="font-medium text-foreground">{campaign.kpi_targets.targetCoverage}%</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    {campaign.status === 'draft' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleActivate(campaign.id)}
                        disabled={isUpdating}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Ativar
                      </Button>
                    )}
                    {campaign.status === 'active' && (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handlePause(campaign.id)}
                        disabled={isUpdating}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Nenhuma campanha encontrada</p>
          </div>
        )}
      </div>

      <NewCampaignDialog open={isNewCampaignOpen} onOpenChange={setIsNewCampaignOpen} />
    </AppLayout>
  );
}
