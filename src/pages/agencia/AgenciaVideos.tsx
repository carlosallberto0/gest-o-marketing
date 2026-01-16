import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Video, ExternalLink, Trash2, Edit, Link, Share2, X } from 'lucide-react';
import { useAgencias, useAgenciaVideos, useCreateAgenciaVideo, useDeleteAgenciaVideo, useUpdateAgenciaVideo, type AgenciaVideo } from '@/hooks/useAgencias';
import { showToast } from '@/lib/toast';

export default function AgenciaVideos() {
  const { data: agencias = [] } = useAgencias();
  const { data: videos = [], isLoading } = useAgenciaVideos();
  const createVideo = useCreateAgenciaVideo();
  const deleteVideo = useDeleteAgenciaVideo();
  const updateVideo = useUpdateAgenciaVideo();

  const [searchTerm, setSearchTerm] = useState('');
  const [agenciaFilter, setAgenciaFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<AgenciaVideo | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    agencia_id: '',
    titulo: '',
    descricao: '',
    link_video: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAgencia = agenciaFilter === 'all' || v.agencia_id === agenciaFilter;
    return matchesSearch && matchesAgencia;
  });

  const handleOpenDialog = (video?: AgenciaVideo) => {
    if (video) {
      setEditingVideo(video);
      setFormData({
        agencia_id: video.agencia_id,
        titulo: video.titulo,
        descricao: video.descricao || '',
        link_video: video.link_video,
        tags: video.tags || [],
      });
    } else {
      setEditingVideo(null);
      setFormData({ agencia_id: '', titulo: '', descricao: '', link_video: '', tags: [] });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVideo(null);
    setFormData({ agencia_id: '', titulo: '', descricao: '', link_video: '', tags: [] });
    setTagInput('');
  };

  const handleSubmit = async () => {
    if (editingVideo) {
      await updateVideo.mutateAsync({
        id: editingVideo.id,
        agencia_id: formData.agencia_id,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        link_video: formData.link_video,
        tags: formData.tags,
      });
    } else {
      await createVideo.mutateAsync({
        ...formData,
        descricao: formData.descricao || null,
        created_by: null,
      });
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este vídeo?')) {
      await deleteVideo.mutateAsync(id);
      setSelectedVideos(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleWatchVideo = (url: string) => {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      showToast.error('Link do vídeo inválido');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleSelectVideo = (id: string) => {
    setSelectedVideos(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(filteredVideos.map(v => v.id)));
    }
  };

  const handleCopyLinks = () => {
    const selectedVideosList = videos.filter(v => selectedVideos.has(v.id));
    const links = selectedVideosList.map(v => v.link_video).join('\n');
    navigator.clipboard.writeText(links);
    showToast.success(`${selectedVideos.size} link(s) copiado(s)!`);
  };

  const handleShareWhatsApp = () => {
    const selectedVideosList = videos.filter(v => selectedVideos.has(v.id));
    const text = selectedVideosList.map(v => `📹 ${v.titulo}\n${v.link_video}`).join('\n\n');
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
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
          <h1 className="text-2xl font-bold text-foreground">Catálogo de Vídeos</h1>
          <p className="text-muted-foreground">Vídeos produzidos pelas agências parceiras</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Vídeo
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
          
          {/* Select All */}
          {filteredVideos.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Checkbox
                id="select-all"
                checked={selectedVideos.size === filteredVideos.length && filteredVideos.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm cursor-pointer">
                Selecionar todos ({filteredVideos.length})
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Videos Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredVideos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum vídeo encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => (
            <Card key={video.id} className={`group transition-all ${selectedVideos.has(video.id) ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedVideos.has(video.id)}
                      onCheckedChange={() => toggleSelectVideo(video.id)}
                    />
                    <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Video className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{video.titulo}</h3>
                    <p className="text-xs text-muted-foreground">{video.agencia?.nome}</p>
                    {video.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{video.descricao}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {video.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleWatchVideo(video.link_video)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Assistir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(video)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(video.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedVideos.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto bg-background border rounded-lg p-4 shadow-lg flex flex-col sm:flex-row items-center gap-4 z-50">
          <span className="text-sm font-medium">{selectedVideos.size} vídeo(s) selecionado(s)</span>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button variant="outline" size="sm" onClick={handleCopyLinks}>
              <Link className="h-4 w-4 mr-2" />
              Copiar Links
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
              <Share2 className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedVideos(new Set())}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </div>
      )}

      {/* Dialog for Create/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Editar Vídeo' : 'Novo Vídeo'}</DialogTitle>
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
                placeholder="Título do vídeo"
              />
            </div>
            <div className="space-y-2">
              <Label>Link do Vídeo *</Label>
              <Input
                value={formData.link_video}
                onChange={(e) => setFormData({ ...formData, link_video: e.target.value })}
                placeholder="https://youtube.com/..."
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
                  placeholder="Ex: comercial, institucional"
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
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.agencia_id || !formData.titulo || !formData.link_video || createVideo.isPending || updateVideo.isPending}
            >
              {editingVideo ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
