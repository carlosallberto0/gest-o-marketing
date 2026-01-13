import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Image, ExternalLink, Trash2 } from 'lucide-react';
import { useAgencias, useAgenciaFotos, useCreateAgenciaFoto, useDeleteAgenciaFoto } from '@/hooks/useAgencias';

export default function AgenciaFotos() {
  const { data: agencias = [] } = useAgencias();
  const { data: fotos = [], isLoading } = useAgenciaFotos();
  const createFoto = useCreateAgenciaFoto();
  const deleteFoto = useDeleteAgenciaFoto();

  const [searchTerm, setSearchTerm] = useState('');
  const [agenciaFilter, setAgenciaFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    agencia_id: '',
    titulo: '',
    descricao: '',
    link_album: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const filteredFotos = fotos.filter(f => {
    const matchesSearch = f.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAgencia = agenciaFilter === 'all' || f.agencia_id === agenciaFilter;
    return matchesSearch && matchesAgencia;
  });

  const handleSubmit = async () => {
    await createFoto.mutateAsync({
      ...formData,
      descricao: formData.descricao || null,
      created_by: null,
    });
    setIsDialogOpen(false);
    setFormData({ agencia_id: '', titulo: '', descricao: '', link_album: '', tags: [] });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este álbum?')) {
      await deleteFoto.mutateAsync(id);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Fotos</h1>
          <p className="text-muted-foreground">Álbuns de fotos produzidos pelas agências</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Álbum
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={agenciaFilter} onValueChange={setAgenciaFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Agência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Agências</SelectItem>
                {agencias.map(ag => (
                  <SelectItem key={ag.id} value={ag.id}>{ag.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fotos Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredFotos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum álbum encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFotos.map((foto) => (
            <Card key={foto.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Image className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{foto.titulo}</h3>
                    <p className="text-xs text-muted-foreground">{foto.agencia?.nome}</p>
                    {foto.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{foto.descricao}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {foto.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={foto.link_album} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ver Álbum
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(foto.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Álbum de Fotos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agência *</Label>
              <Select value={formData.agencia_id} onValueChange={(v) => setFormData({ ...formData, agencia_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma agência" />
                </SelectTrigger>
                <SelectContent>
                  {agencias.filter(a => a.ativo).map(ag => (
                    <SelectItem key={ag.id} value={ag.id}>{ag.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título do álbum"
              />
            </div>
            <div className="space-y-2">
              <Label>Link do Álbum *</Label>
              <Input
                value={formData.link_album}
                onChange={(e) => setFormData({ ...formData, link_album: e.target.value })}
                placeholder="https://photos.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Ex: evento, produto"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>Adicionar</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formData.agencia_id || !formData.titulo || !formData.link_album || createFoto.isPending}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
