import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Copy, 
  ExternalLink, 
  MessageCircle, 
  QrCode,
  RefreshCw,
  Shield,
  Calendar,
  User,
  Mail,
  Loader2,
  Check,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { 
  AccessLinkUser, 
  generateWhatsAppLink, 
  getAccessLinkStatus,
  formatExpirationDate,
  formatLastAccess,
} from '@/hooks/useAccessLinks';
import { getPublicAppUrl } from '@/hooks/usePublicAppUrl';

interface AccessLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AccessLinkUser | null;
  accessLink: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onRevoke: () => void;
}

export function AccessLinkDialog({
  open,
  onOpenChange,
  user,
  accessLink,
  isGenerating,
  onGenerate,
  onRevoke,
}: AccessLinkDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const linkStatus = getAccessLinkStatus(user);
  // SEMPRE usar a URL pública canônica, nunca window.location.origin
  const publicUrl = getPublicAppUrl();
  const currentLink = accessLink || (user.access_token ? `${publicUrl}/acesso/${user.access_token}` : null);

  const handleCopy = async () => {
    if (!currentLink) return;
    
    await navigator.clipboard.writeText(currentLink);
    setCopied(true);
    showToast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!currentLink) return;
    window.open(generateWhatsAppLink(currentLink, user.name), '_blank');
  };

  const handleOpenLink = () => {
    if (!currentLink) return;
    window.open(currentLink, '_blank');
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      admin: 'Administrador',
      director: 'Diretor',
      manager: 'Gerente',
      collaborator: 'Colaborador',
      supplier: 'Fornecedor',
      coordenador_compras: 'Coord. Compras',
      convenience_coordinator: 'Coord. Conveniência',
    };
    return roleNames[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gerenciar Acesso
          </DialogTitle>
          <DialogDescription>
            Configure o link de acesso pessoal para este usuário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>
              <Badge variant="outline">{getRoleName(user.role)}</Badge>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status do Link</span>
            <span className={`text-sm font-medium ${linkStatus.color}`}>
              {linkStatus.label}
            </span>
          </div>

          {currentLink && linkStatus.status !== 'none' && (
            <>
              <Separator />

              {/* Link Display */}
              <div className="space-y-2">
                <Label>Link de Acesso</Label>
                <div className="flex gap-2">
                  <Input 
                    value={currentLink} 
                    readOnly 
                    className="text-xs font-mono"
                  />
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expiration */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Válido até
                </span>
                <span className="font-medium">
                  {formatExpirationDate(user.token_valido_ate)}
                </span>
              </div>

              {/* Last Access */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Último acesso</span>
                <span className="font-medium">
                  {formatLastAccess(user.ultimo_acesso_via_link)}
                </span>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <Label>Ações Rápidas</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-col h-auto py-3"
                  >
                    <Copy className="h-4 w-4 mb-1" />
                    <span className="text-xs">Copiar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWhatsApp}
                    className="flex-col h-auto py-3"
                  >
                    <MessageCircle className="h-4 w-4 mb-1" />
                    <span className="text-xs">WhatsApp</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenLink}
                    className="flex-col h-auto py-3"
                  >
                    <ExternalLink className="h-4 w-4 mb-1" />
                    <span className="text-xs">Testar</span>
                  </Button>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            {linkStatus.status === 'none' || linkStatus.status === 'expired' ? (
              <Button 
                onClick={onGenerate} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                Gerar Link de Acesso
              </Button>
            ) : (
              <>
                <Button 
                  onClick={onGenerate} 
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Renovar Link
                </Button>
                <Button 
                  onClick={onRevoke}
                  variant="destructive"
                  className="w-full"
                >
                  Revogar Acesso
                </Button>
              </>
            )}
          </div>

          {/* Info Note */}
          <p className="text-xs text-muted-foreground text-center">
            Links renovados invalidam os anteriores automaticamente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
