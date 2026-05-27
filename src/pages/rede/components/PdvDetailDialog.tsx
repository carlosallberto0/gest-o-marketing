import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Fuel, Phone, FileText, ExternalLink } from 'lucide-react';
import { PublicPdv, ServicoOption } from '@/hooks/usePublicNetwork';

interface Props {
  pdv: PublicPdv | null;
  servicos: ServicoOption[];
  onClose: () => void;
}

export function PdvDetailDialog({ pdv, servicos, onClose }: Props) {
  const labelByKey = new Map(servicos.map((s) => [s.key, s.label]));
  return (
    <Dialog open={!!pdv} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {pdv && (
          <>
            <DialogHeader>
              <div className="text-xs text-muted-foreground">{pdv.code}</div>
              <DialogTitle>{pdv.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {pdv.bandeira && (
                <div className="flex items-center gap-2 text-sm">
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">{pdv.bandeira}</Badge>
                </div>
              )}
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{pdv.address}, {pdv.city} - {pdv.state}</span>
              </div>
              {pdv.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${pdv.phone}`} className="text-primary hover:underline">{pdv.phone}</a>
                </div>
              )}
              {pdv.cnpj && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>CNPJ {pdv.cnpj}</span>
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Serviços</div>
                {pdv.servicos.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {pdv.servicos.map((k) => (
                      <Badge key={k} variant="outline">{labelByKey.get(k) || k}</Badge>
                    ))}
                  </div>
                )}
              </div>

              {pdv.maps_url && (
                <Button asChild variant="outline" className="w-full">
                  <a href={pdv.maps_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir no Google Maps
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
