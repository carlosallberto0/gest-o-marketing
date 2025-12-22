import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDirectorObservations } from '@/hooks/useDirectorObservations';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Loader2,
  MessageSquare,
  Megaphone,
  Building,
  Calendar,
  ExternalLink,
  Eye
} from 'lucide-react';

export default function DirectorObservations() {
  const navigate = useNavigate();
  const { data: observations = [], isLoading } = useDirectorObservations();

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
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Minhas Observações
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico de observações estratégicas enviadas ao Super Admin
          </p>
        </div>

        {/* Stats */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{observations.length}</p>
                <p className="text-sm text-muted-foreground">Total de Observações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observations List */}
        {observations.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhuma observação encontrada</h3>
                <p className="text-muted-foreground mt-1">
                  Você ainda não enviou observações estratégicas
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/outdoors')}
                >
                  Ver Outdoors
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {observations.map((obs) => (
              <Card key={obs.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      {/* Outdoor Info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-info/10 text-info">
                          <Megaphone className="h-3 w-3 mr-1" />
                          {obs.outdoor?.code || 'Outdoor'}
                        </Badge>
                        {obs.outdoor?.pdv?.name && (
                          <Badge variant="outline" className="bg-muted">
                            <Building className="h-3 w-3 mr-1" />
                            {obs.outdoor.pdv.name}
                          </Badge>
                        )}
                      </div>

                      {/* Observation Text */}
                      <p className="text-foreground">{obs.texto}</p>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(obs.criada_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>

                    {/* Action */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/outdoor/${obs.outdoor_id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Outdoor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
