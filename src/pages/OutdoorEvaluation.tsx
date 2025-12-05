import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockOutdoors, mockPDVs, getStatusColor, getStatusLabel } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MultiPhotoUpload } from '@/components/ui/photo-upload';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Megaphone, 
  MapPin, 
  Maximize,
  Calendar,
  Camera,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Ruler
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { OutdoorStatus } from '@/types';

export default function OutdoorEvaluation() {
  const navigate = useNavigate();
  const [selectedOutdoor, setSelectedOutdoor] = useState<string>('');
  const [status, setStatus] = useState<OutdoorStatus | ''>('');
  const [nonOperationalReason, setNonOperationalReason] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [measuresConfirmed, setMeasuresConfirmed] = useState(false);
  const [observations, setObservations] = useState('');

  const outdoor = mockOutdoors.find(o => o.id === selectedOutdoor);
  const pdv = outdoor ? mockPDVs.find(p => p.id === outdoor.pdvId) : null;

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

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    toast.success('Avaliação enviada com sucesso!');
    navigate('/outdoors');
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliação Mensal de Outdoor</h1>
          <p className="text-muted-foreground mt-1">
            Registre o status atual do outdoor
          </p>
        </div>

        {/* Outdoor Selection */}
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Selecionar Outdoor
          </label>
          <Select value={selectedOutdoor} onValueChange={setSelectedOutdoor}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um outdoor" />
            </SelectTrigger>
            <SelectContent>
              {mockOutdoors.map(out => (
                <SelectItem key={out.id} value={out.id}>
                  {out.code} - {out.pdvName} ({out.location})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Outdoor Details */}
          {outdoor && (
            <div className="mt-4 pt-4 border-t border-border space-y-3 animate-slide-up">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{outdoor.code}</h3>
                  <p className="text-sm text-muted-foreground">{outdoor.pdvName}</p>
                </div>
                <Badge className={getStatusColor(outdoor.status)}>
                  {getStatusLabel(outdoor.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{outdoor.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Maximize className="h-4 w-4" />
                  <span>{outdoor.width}m x {outdoor.height}m</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ruler className="h-4 w-4" />
                  <span>{outdoor.area}m² de área</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {outdoor.lastEvaluation 
                      ? `Última: ${new Date(outdoor.lastEvaluation).toLocaleDateString('pt-BR')}`
                      : 'Primeira avaliação'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Selection */}
        {selectedOutdoor && (
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm animate-slide-up">
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

            {/* Non-operational reason */}
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
        )}

        {/* Photo Upload */}
        {selectedOutdoor && status && (
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm animate-slide-up">
            <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotos do Outdoor <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-auto">Mínimo 1 foto</span>
            </label>
            <MultiPhotoUpload
              value={photos}
              onChange={setPhotos}
              maxPhotos={5}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tire fotos claras mostrando o estado atual do outdoor
            </p>
          </div>
        )}

        {/* Measures Confirmation */}
        {selectedOutdoor && status && outdoor && (
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
        {selectedOutdoor && status && (
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
        {selectedOutdoor && status && (
          <div className="flex gap-3 animate-slide-up">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/outdoors')}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-success hover:bg-success/90"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Avaliação
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
