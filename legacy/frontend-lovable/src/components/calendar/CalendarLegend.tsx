import { cn } from '@/lib/utils';

const legendItems = [
  { label: 'Urgente', color: 'bg-destructive' },
  { label: 'Atenção', color: 'bg-orange-500' },
  { label: 'Info', color: 'bg-primary' },
];

export function CalendarLegend() {
  return (
    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", item.color)} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
