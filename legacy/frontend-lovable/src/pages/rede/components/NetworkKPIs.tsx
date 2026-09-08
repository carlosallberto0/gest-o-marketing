import { Card } from '@/components/ui/card';
import { MapPin, Fuel, Store, Sparkles } from 'lucide-react';

interface Props {
  total: number;
  bandeiras: number;
  withConveniencia: number;
  withLavaJato: number;
}

const items = [
  { key: 'total', label: 'Postos na rede', icon: MapPin },
  { key: 'bandeiras', label: 'Bandeiras', icon: Fuel },
  { key: 'conv', label: 'Com conveniência', icon: Store },
  { key: 'lava', label: 'Com lava jato', icon: Sparkles },
];

export function NetworkKPIs({ total, bandeiras, withConveniencia, withLavaJato }: Props) {
  const values: Record<string, number> = {
    total,
    bandeiras,
    conv: withConveniencia,
    lava: withLavaJato,
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(({ key, label, icon: Icon }) => (
        <Card key={key} className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-semibold text-foreground leading-none">{values[key]}</div>
            <div className="text-xs text-muted-foreground mt-1 truncate">{label}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
