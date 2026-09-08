import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Fuel } from 'lucide-react';
import { PublicPdv, ServicoOption } from '@/hooks/usePublicNetwork';

interface Props {
  pdvs: PublicPdv[];
  servicos: ServicoOption[];
  onSelect: (pdv: PublicPdv) => void;
}

export function NetworkGrid({ pdvs, servicos, onSelect }: Props) {
  const labelByKey = new Map(servicos.map((s) => [s.key, s.label]));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {pdvs.map((p) => (
        <Card
          key={p.id}
          className="p-4 cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-3"
          onClick={() => onSelect(p)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{p.code}</div>
              <h3 className="font-semibold text-foreground line-clamp-1">{p.name}</h3>
            </div>
            {p.bandeira && (
              <Badge variant="secondary" className="shrink-0">
                <Fuel className="h-3 w-3 mr-1" /> {p.bandeira}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{p.address}, {p.city} - {p.state}</span>
          </div>
          {p.servicos.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto">
              {p.servicos.slice(0, 4).map((k) => (
                <Badge key={k} variant="outline" className="text-[10px] font-normal">
                  {labelByKey.get(k) || k}
                </Badge>
              ))}
              {p.servicos.length > 4 && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  +{p.servicos.length - 4}
                </Badge>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
