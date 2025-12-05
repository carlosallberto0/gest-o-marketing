import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOutdoors } from '@/hooks/useOutdoorData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, getStatusLabel } from '@/data/mockData';
import { 
  ArrowLeft, 
  MapPin, 
  Maximize, 
  Ruler, 
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  ClipboardCheck
} from 'lucide-react';

export default function OutdoorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: outdoors = [], isLoading } = useOutdoors();
  
  const outdoor = outdoors.find(o => o.id === id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!outdoor) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Outdoor não encontrado</h2>
          <p className="text-muted-foreground mb-4">O outdoor solicitado não existe ou foi removido.</p>
          <Button onClick={() => navigate('/outdoors')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Outdoors
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/outdoors')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{outdoor.code}</h1>
            <p className="text-muted-foreground">{outdoor.pdvName}</p>
          </div>
          <Badge className={getStatusColor(outdoor.status)}>
            {getStatusLabel(outdoor.status)}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Photo */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="aspect-video bg-muted">
              <img 
                src={outdoor.photoUrl || '/placeholder.svg'} 
                alt={outdoor.code}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Informações do Outdoor</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="font-medium text-foreground">{outdoor.location}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Maximize className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Dimensões</p>
                    <p className="font-medium text-foreground">{outdoor.width}m x {outdoor.height}m</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Ruler className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Área Total</p>
                    <p className="font-medium text-foreground">{outdoor.area} m²</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Última Avaliação</p>
                    <p className="font-medium text-foreground">
                      {outdoor.lastEvaluation 
                        ? new Date(outdoor.lastEvaluation).toLocaleDateString('pt-BR')
                        : 'Nunca avaliado'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {outdoor.nonOperationalReason && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">Motivo da não operação:</p>
                  <p className="text-sm text-destructive/80">{outdoor.nonOperationalReason}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => navigate('/outdoor-evaluation')}
                className="bg-primary hover:bg-primary/90"
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Avaliar Outdoor
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate(`/contracts?outdoor=${outdoor.id}`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ver Contrato
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
