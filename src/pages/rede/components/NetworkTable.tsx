import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PublicPdv } from '@/hooks/usePublicNetwork';

interface Props {
  pdvs: PublicPdv[];
  onSelect: (pdv: PublicPdv) => void;
}

export function NetworkTable({ pdvs, onSelect }: Props) {
  return (
    <div className="rounded-md border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Posto</TableHead>
            <TableHead>Bandeira</TableHead>
            <TableHead>Cidade / UF</TableHead>
            <TableHead className="text-right">Serviços</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pdvs.map((p) => (
            <TableRow key={p.id} className="cursor-pointer" onClick={() => onSelect(p)}>
              <TableCell className="font-mono text-xs">{p.code}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>
                {p.bandeira ? <Badge variant="secondary">{p.bandeira}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
              </TableCell>
              <TableCell className="text-sm">{p.city} / {p.state}</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">{p.servicos.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
