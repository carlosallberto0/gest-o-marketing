import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface CriticalItem {
  id: string;
  question: string;
  category: string;
  noCount: number;
  totalEvaluations: number;
  failRate: number;
}

interface CriticalItemsCardProps {
  items: CriticalItem[];
}

export function CriticalItemsCard({ items }: CriticalItemsCardProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Itens Críticos
          <Badge variant="destructive" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum item crítico identificado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 5).map((item, index) => (
              <div 
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-destructive">{item.failRate}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{item.question}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.category} • {item.noCount} de {item.totalEvaluations} avaliações
                  </p>
                </div>
              </div>
            ))}
            {items.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate('/reports')}
              >
                Ver todos os {items.length} itens
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
