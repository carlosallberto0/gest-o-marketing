import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContractAlert {
  id: string;
  farmerName: string;
  outdoorCode: string;
  endDate: string;
  daysRemaining: number;
}

interface ContractAlertsCardProps {
  contracts: ContractAlert[];
}

export function ContractAlertsCard({ contracts }: ContractAlertsCardProps) {
  const navigate = useNavigate();

  const getSeverityColor = (days: number) => {
    if (days <= 7) return 'bg-destructive text-destructive-foreground';
    if (days <= 14) return 'bg-warning text-warning-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const getSeverityBorder = (days: number) => {
    if (days <= 7) return 'border-destructive/20 bg-destructive/5';
    if (days <= 14) return 'border-warning/20 bg-warning/5';
    return 'border-border';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-warning" />
          Contratos a Vencer
          {contracts.length > 0 && (
            <Badge variant="secondary" className="ml-auto bg-warning/10 text-warning">
              {contracts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum contrato próximo do vencimento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.slice(0, 5).map((contract, index) => (
              <div 
                key={contract.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border animate-slide-up",
                  getSeverityBorder(contract.daysRemaining)
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {contract.farmerName}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {contract.outdoorCode}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Vence em {format(new Date(contract.endDate), "dd 'de' MMMM", { locale: ptBR })}</span>
                  </div>
                </div>
                <Badge className={cn("text-xs flex-shrink-0", getSeverityColor(contract.daysRemaining))}>
                  {contract.daysRemaining <= 0 ? 'Vencido' : `${contract.daysRemaining}d`}
                </Badge>
              </div>
            ))}
            {contracts.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate('/contracts')}
              >
                Ver todos os {contracts.length} contratos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
