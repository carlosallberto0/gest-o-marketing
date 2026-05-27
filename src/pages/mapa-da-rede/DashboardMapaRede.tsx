import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ExternalLink } from 'lucide-react';
import { usePublicNetwork, PublicPdv } from '@/hooks/usePublicNetwork';
import { EditPdvServicesDialog } from './EditPdvServicesDialog';
import { Link } from 'react-router-dom';

export default function DashboardMapaRede() {
  const { data, isLoading } = usePublicNetwork();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PublicPdv | null>(null);

  const pdvs = data?.pdvs || [];
  const servicos = data?.servicos || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return pdvs;
    return pdvs.filter((p) =>
      `${p.name} ${p.code} ${p.city} ${p.bandeira || ''}`.toLowerCase().includes(q)
    );
  }, [pdvs, search]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mapa da Rede — Administração</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie bandeira, CNPJ, telefone e serviços oferecidos por posto. Visível no portal público em <code className="font-mono text-xs">/rede</code>.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/rede" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" /> Ver portal público
            </Link>
          </Button>
        </div>

        <Card className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar posto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Posto</TableHead>
                  <TableHead>Bandeira</TableHead>
                  <TableHead>Cidade / UF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-center">Serviços</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.bandeira ? <Badge variant="secondary">{p.bandeira}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">{p.city} / {p.state}</TableCell>
                    <TableCell className="text-sm">{p.phone || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center text-sm">{p.servicos.length}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Editar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <EditPdvServicesDialog
        open={!!editing}
        pdv={editing}
        servicos={servicos}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
