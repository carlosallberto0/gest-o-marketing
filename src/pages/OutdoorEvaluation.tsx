import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOutdoors, useCreateMediaEvaluation } from '@/hooks/useOutdoorData';
import { useCreateMaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import { useAuth } from '@/hooks/useAuth';
import { getStatusColor, getStatusLabel } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GeoPhotoUpload, GeoPhotoData } from '@/components/ui/geo-photo-upload';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MapPin, 
  Maximize,
  Calendar,
  Camera,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Ruler,
  Loader2,
  Building,
  ChevronRight,
  ExternalLink,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { OutdoorStatus } from '@/types';

// Helper para formatar localização
const formatLocation = (location: string) => {
  const isUrl = /^https?:\/\//.test(location) || /maps\.app\.goo\.gl/.test(location) || /goo\.gl/.test(location) || /google\.com\/maps/.test(location);
  
  if (isUrl) {
    const url = location.startsWith('http') ? location : `https://${location}`;
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center gap-1 truncate"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">Ver no Mapa</span>
      </a>
    );
  }
  
  return <span className="truncate">{location}</span>;
};

export default function OutdoorEvaluation() {
  const navigate = useNavigate();
  const [selectedPdv, setSelectedPdv] = useState<string>('');
  const [selectedOutdoor, setSelectedOutdoor] = useState<string>('');
  const [status, setStatus] = useState<OutdoorStatus | ''>('');
  const [nonOperationalReason, setNonOperationalReason] = useState('');
  const [photos, setPhotos] = useState<GeoPhotoData[]>([]);
  const [measuresConfirmed, setMeasuresConfirmed] = useState(false);
  const [observations, setObservations] = useState('');
  
  // Maintenance request states
  const [requestMaintenance, setRequestMaintenance] = useState(false);
  const [maintenanceObservations, setMaintenanceObservations] = useState('');
  const [maintenanceUrgency, setMaintenanceUrgency] = useState<'baixa' | 'normal' | 'alta' | 'emergencial'>('normal');
  const [maintenanceType, setMaintenanceType] = useState<'preventiva' | 'corretiva'>('corretiva');

  const urgencyOptions = [
    { value: 'baixa' as const, label: 'Baixa', description: 'Sem pressa, pode agendar', color: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-950 dark:text-green-300' },
    { value: 'normal' as const, label: 'Normal', description: 'Manutenção necessária', color: 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' },
    { value: 'alta' as const, label: 'Alta', description: 'Prioridade operacional', color: 'bg-orange-100 border-orange-400 text-orange-800 dark:bg-orange-950 dark:text-orange-300' },
    { value: 'emergencial' as const, label: 'Emergencial', description: 'Impacto crítico', color: 'bg-red-100 border-red-400 text-red-800 dark:bg-red-950 dark:text-red-300' },
  ];

  const maintenanceTypeOptions = [
    { value: 'preventiva' as const, label: 'Preventiva', icon: '🛡️', description: 'Evitar problemas' },
    { value: 'corretiva' as const, label: 'Corretiva', icon: '🔧', description: 'Corrigir problema' },
  ];

  const { data: outdoors = [], isLoading } = useOutdoors();
  const createEvaluation = useCreateMediaEvaluation();
  const createMaintenanceRequest = useCreateMaintenanceRequest();
  const { profile } = useAuth();

  // Group outdoors by PDV and filter only those needing evaluation
  const pdvsWithPendingOutdoors = useMemo(() => {
    const pdvMap = new Map<string, { pdvId: string; pdvName: string; outdoors: typeof outdoors }>();
    
    outdoors.forEach(outdoor => {
      // Only include outdoors that need evaluation (pending or non_operational)
      if (outdoor.status === 'pending_evaluation' || outdoor.status === 'non_operational') {
        const existing = pdvMap.get(outdoor.pdvId);
        if (existing) {
          existing.outdoors.push(outdoor);
        } else {
          pdvMap.set(outdoor.pdvId, {
            pdvId: outdoor.pdvId,
            pdvName: outdoor.pdvName,
            outdoors: [outdoor],
          });
        }
      }
    });
    
    return Array.from(pdvMap.values());
  }, [outdoors]);

  const selectedPdvData = pdvsWithPendingOutdoors.find(p => p.pdvId === selectedPdv);
  const outdoor = outdoors.find(o => o.id === selectedOutdoor);

  const statusOptions: { value: OutdoorStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'operational', label: 'Operacional', icon: <CheckCircle className="h-5 w-5" />, color: 'bg-success text-success-foreground' },
    { value: 'non_operational', label: 'Não Operacional', icon: <XCircle className="h-5 w-5" />, color: 'bg-destructive text-destructive-foreground' },
    { value: 'pending_evaluation', label: 'Aguardando Avaliação', icon: <Clock className="h-5 w-5" />, color: 'bg-warning text-warning-foreground' },
  ];

  const nonOperationalReasons = [
    'Lona rasgada',
    'Estrutura danificada',
    'Vegetação obstruindo',
    'Iluminação defeituosa',
    'Arte desbotada',
    'Vandalismo',
    'Remoção solicitada',
    'Outro',
  ];

  const canSubmit = selectedOutdoor && status && photos.length > 0 && 
    (status !== 'non_operational' || nonOperationalReason) && measuresConfirmed;

  const isSubmitting = createEvaluation.isPending || createMaintenanceRequest.isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !outdoor || !status || !profile) {
      showToast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // 1. Create the evaluation
      const evaluation = await createEvaluation.mutateAsync({
        outdoorId: outdoor.id,
        pdvId: outdoor.pdvId,
        status: status as OutdoorStatus,
        nonOperationalReason: status === 'non_operational' ? nonOperationalReason : undefined,
        photos,
        measuresConfirmed,
        observations: observations || undefined,
      });

      // 2. If maintenance was requested, create the maintenance request
      if (requestMaintenance && status === 'non_operational') {
        await createMaintenanceRequest.mutateAsync({
          outdoor_id: outdoor.id,
          evaluation_id: evaluation?.id,
          reason: nonOperationalReason,
          observations: maintenanceObservations || observations || undefined,
          photos: photos.map(p => p.url),
          current_photo_url: photos[0]?.url,
          urgency: maintenanceUrgency,
          maintenance_type: maintenanceType,
        });
        showToast.success('Avaliação enviada e manutenção solicitada!');
      } else {
        showToast.success('Avaliação enviada com sucesso!');
      }
      
      navigate('/outdoors');
    } catch (error) {
      showToast.error('Erro ao enviar avaliação');
      console.error(error);
    }
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

  if (pdvsWithPendingOutdoors.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
          <h2 className="text-xl font-semibold mb-2">Todos os outdoors estão OK!</h2>
          <p className="text-muted-foreground">Não há outdoors pendentes de avaliação no momento.</p>
          <Button className="mt-4" onClick={() => navigate('/outdoors')}>
            Ver todos os outdoors
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliação Mensal de Outdoor</h1>
          <p className="text-muted-foreground mt-1">
            Selecione um posto e avalie os outdoors pendentes
          </p>
        </div>

        {/* PDV Selection Cards */}
        {!selectedPdv && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Postos com Outdoors Pendentes</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pdvsWithPendingOutdoors.map(pdv => (
                <Card 
                  key={pdv.pdvId} 
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                  onClick={() => setSelectedPdv(pdv.pdvId)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building className="h-5 w-5 text-primary" />
                      {pdv.pdvName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                          <Clock className="h-3 w-3 mr-1" />
                          {pdv.outdoors.length} outdoor(s) pendente(s)
                        </Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Outdoor Selection within PDV */}
        {selectedPdv && !selectedOutdoor && selectedPdvData && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setSelectedPdv('')}>
                ← Voltar
              </Button>
              <h2 className="text-lg font-semibold">{selectedPdvData.pdvName} - Outdoors Pendentes</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {selectedPdvData.outdoors.map(out => (
                <Card 
                  key={out.id} 
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                  onClick={() => setSelectedOutdoor(out.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-3 sm:gap-4">
                      {out.photoUrl && (
                        <img 
                          src={out.photoUrl} 
                          alt={out.code} 
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{out.code}</h3>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 min-w-0">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {formatLocation(out.location)}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Maximize className="h-3 w-3 flex-shrink-0" /> {out.width}m x {out.height}m
                        </p>
                        <Badge className={cn("mt-2", getStatusColor(out.status))}>
                          {getStatusLabel(out.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Evaluation Form */}
        {selectedOutdoor && outdoor && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setSelectedOutdoor('')}>
                ← Voltar
              </Button>
              <h2 className="text-lg font-semibold">Avaliar: {outdoor.code}</h2>
            </div>

            {/* Outdoor Details */}
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{outdoor.code}</h3>
                  <p className="text-sm text-muted-foreground">{outdoor.pdvName}</p>
                </div>
                <Badge className={getStatusColor(outdoor.status)}>
                  {getStatusLabel(outdoor.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-4">
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  {formatLocation(outdoor.location)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Maximize className="h-4 w-4 flex-shrink-0" />
                  <span>{outdoor.width}m x {outdoor.height}m</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ruler className="h-4 w-4 flex-shrink-0" />
                  <span>{outdoor.area}m² de área</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {outdoor.lastEvaluation 
                      ? `Última: ${new Date(outdoor.lastEvaluation).toLocaleDateString('pt-BR')}`
                      : 'Primeira avaliação'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
              <label className="text-sm font-medium text-foreground mb-3 block">
                Status do Outdoor
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatus(option.value);
                      if (option.value !== 'non_operational') {
                        setNonOperationalReason('');
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      status === option.value 
                        ? `${option.color} border-transparent` 
                        : "border-border hover:border-primary/30 text-muted-foreground"
                    )}
                  >
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>

              {status === 'non_operational' && (
                <div className="mt-4 animate-slide-up">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Motivo da não operação <span className="text-destructive">*</span>
                  </label>
                  <Select value={nonOperationalReason} onValueChange={setNonOperationalReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {nonOperationalReasons.map(reason => (
                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Maintenance Request Section */}
            {status === 'non_operational' && (
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-5 border border-orange-200 dark:border-orange-900 shadow-sm animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-foreground">Solicitar Manutenção</h3>
                  </div>
                  <Switch
                    checked={requestMaintenance}
                    onCheckedChange={setRequestMaintenance}
                  />
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Ao ativar, uma solicitação de manutenção será criada automaticamente 
                  para análise do Super Admin.
                </p>
                
                {requestMaintenance && (
                  <div className="space-y-4 animate-slide-up">
                    {/* Maintenance Type */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-foreground">Tipo de Manutenção</label>
                      <div className="grid grid-cols-2 gap-3">
                        {maintenanceTypeOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMaintenanceType(option.value)}
                            className={cn(
                              "p-3 rounded-lg border-2 text-center transition-all",
                              maintenanceType === option.value 
                                ? "border-primary bg-primary/10" 
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className="text-xl mb-1">{option.icon}</div>
                            <div className="font-medium text-sm">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Urgency Level */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-foreground">Nível de Urgência</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {urgencyOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setMaintenanceUrgency(option.value)}
                            className={cn(
                              "p-2 rounded-lg border-2 text-center transition-all",
                              option.color,
                              maintenanceUrgency === option.value 
                                ? "ring-2 ring-offset-1 ring-primary border-transparent" 
                                : "opacity-70 hover:opacity-100"
                            )}
                          >
                            <div className="font-medium text-xs">{option.label}</div>
                            <div className="text-[10px] opacity-80">{option.description}</div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                        <span className="text-primary">ℹ️</span>
                        O prazo real será negociado pelo Super Admin com o fornecedor após aprovação.
                      </p>
                    </div>

                    {/* Observations */}
                    <div>
                      <label className="text-sm font-medium mb-2 block text-foreground">
                        Descrição do Problema (opcional)
                      </label>
                      <Textarea
                        value={maintenanceObservations}
                        onChange={(e) => setMaintenanceObservations(e.target.value)}
                        placeholder="Descreva detalhes adicionais sobre o problema que requer manutenção..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium">Resumo da Solicitação:</p>
                        <ul className="list-disc list-inside mt-1 text-xs space-y-0.5">
                          <li>Tipo: {maintenanceType === 'preventiva' ? '🛡️ Preventiva' : '🔧 Corretiva'}</li>
                          <li>Urgência: {urgencyOptions.find(u => u.value === maintenanceUrgency)?.label} ({urgencyOptions.find(u => u.value === maintenanceUrgency)?.description})</li>
                          <li>Status do outdoor será "Não Operacional"</li>
                          <li>Super Admin será notificado em tempo real</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Photo Upload */}
            {status && (
              <div className="bg-card rounded-xl p-5 border border-border shadow-sm animate-slide-up">
                <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Fotos do Outdoor <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-auto">Mínimo 1 foto</span>
                </label>
                <GeoPhotoUpload
                  value={photos}
                  onChange={setPhotos}
                  maxPhotos={5}
                />
              </div>
            )}

            {/* Measures Confirmation */}
            {status && (
              <div className="bg-card rounded-xl p-5 border border-border shadow-sm animate-slide-up">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={measuresConfirmed}
                    onChange={(e) => setMeasuresConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Confirmo as medidas do outdoor <span className="text-destructive">*</span>
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Largura: {outdoor.width}m | Altura: {outdoor.height}m | Área: {outdoor.area}m²
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Observations */}
            {status && (
              <div className="bg-card rounded-xl p-5 border border-border shadow-sm animate-slide-up">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Observações (opcional)
                </label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Adicione observações sobre o outdoor..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            )}

            {/* Submit */}
            {status && (
              <div className="flex gap-3 animate-slide-up">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate('/outdoors')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  className={cn(
                    "flex-1",
                    requestMaintenance && status === 'non_operational'
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-success hover:bg-success/90"
                  )}
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : requestMaintenance && status === 'non_operational' ? (
                    <Wrench className="h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {requestMaintenance && status === 'non_operational'
                    ? 'Enviar + Solicitar Manutenção'
                    : 'Enviar Avaliação'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}