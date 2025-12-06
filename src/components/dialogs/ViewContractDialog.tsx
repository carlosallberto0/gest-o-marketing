import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  CreditCard,
  RefreshCw,
  FileText,
  Download,
  MapPin
} from 'lucide-react';

interface Contract {
  id: string;
  outdoor_id: string;
  farmer_name: string;
  farmer_cpf: string;
  farmer_phone: string | null;
  farmer_email: string | null;
  start_date: string;
  end_date: string;
  monthly_value: number;
  annual_value: number;
  payment_method: 'cash' | 'fuel' | 'both';
  auto_renewal: boolean;
  status: string;
  document_url: string | null;
  outdoors?: {
    code: string;
    location: string;
    pdvs?: {
      name: string;
    };
  };
}

interface ViewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-success/10 text-success border-success/20';
    case 'expiring': return 'bg-warning/10 text-warning border-warning/20';
    case 'expired': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Ativo';
    case 'expiring': return 'Vencendo';
    case 'expired': return 'Vencido';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Dinheiro';
    case 'fuel': return 'Combustível';
    case 'both': return 'Misto';
    default: return method;
  }
};

export function ViewContractDialog({ open, onOpenChange, contract }: ViewContractDialogProps) {
  if (!contract) return null;

  const handleDownload = () => {
    if (contract.document_url) {
      window.open(contract.document_url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato {contract.outdoors?.code}
            </DialogTitle>
            <Badge className={getStatusColor(contract.status)}>
              {getStatusLabel(contract.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Outdoor Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{contract.outdoors?.pdvs?.name}</p>
                <p className="text-sm text-muted-foreground">{contract.outdoors?.location}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Farmer Info */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Proprietário da Área</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{contract.farmer_name}</span>
                <span className="text-sm text-muted-foreground">({contract.farmer_cpf})</span>
              </div>
              {contract.farmer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{contract.farmer_phone}</span>
                </div>
              )}
              {contract.farmer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{contract.farmer_email}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Contract Details */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Detalhes do Contrato</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Vigência</p>
                  <p className="font-medium">
                    {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    até {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.monthly_value)}
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.annual_value)}/ano
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Pagamento</p>
                  <p className="font-medium">{getPaymentMethodLabel(contract.payment_method)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Renovação Automática</p>
                  <p className="font-medium">{contract.auto_renewal ? 'Sim' : 'Não'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Document Download */}
          {contract.document_url && (
            <>
              <Separator />
              <Button variant="outline" className="w-full" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Documento do Contrato
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
