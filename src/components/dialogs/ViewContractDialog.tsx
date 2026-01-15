import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContractImageGallery } from '@/components/contracts/ContractImageGallery';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSystemOptions } from '@/hooks/useSystemOptions';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  CreditCard,
  RefreshCw,
  FileText,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContractOutdoor {
  outdoor: {
    id: string;
    code: string;
    location: string;
    pdvs: {
      name: string;
    } | null;
  };
}

interface ContractImage {
  id: string;
  image_url: string;
  page_order: number;
}

interface Contract {
  id: string;
  outdoor_id: string | null;
  farmer_name: string;
  farmer_cpf: string;
  farmer_phone: string | null;
  farmer_email: string | null;
  start_date: string;
  end_date: string;
  monthly_value: number;
  annual_value: number;
  payment_method: string;
  auto_renewal: boolean;
  status: string;
  document_url: string | null;
  contract_outdoors?: ContractOutdoor[];
  contract_images?: ContractImage[];
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

export function ViewContractDialog({ open, onOpenChange, contract }: ViewContractDialogProps) {
  const { data: paymentOptions = [] } = useSystemOptions('contract_payment_method');

  if (!contract) return null;

  const getPaymentMethodLabel = (method: string) => {
    const option = paymentOptions.find(o => o.option_key === method);
    if (option) return option.option_label;
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'fuel': return 'Combustível';
      case 'both': return 'Misto';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  // Get outdoors from contract_outdoors or legacy outdoor
  const linkedOutdoors = contract.contract_outdoors && contract.contract_outdoors.length > 0
    ? contract.contract_outdoors.map(co => co.outdoor)
    : contract.outdoors 
      ? [{ id: contract.outdoor_id!, code: contract.outdoors.code, location: contract.outdoors.location, pdvs: contract.outdoors.pdvs || null }]
      : [];

  // Get images from contract_images
  const images = contract.contract_images
    ?.sort((a, b) => a.page_order - b.page_order)
    .map(img => img.image_url) || [];

  // Get title
  const getTitle = () => {
    if (linkedOutdoors.length > 0) {
      if (linkedOutdoors.length === 1) {
        return `Contrato ${linkedOutdoors[0].code}`;
      }
      return `Contrato (${linkedOutdoors.length} outdoors)`;
    }
    return 'Contrato';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">{getTitle()}</span>
            <Badge className={`shrink-0 ${getStatusColor(contract.status)}`}>
              {getStatusLabel(contract.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-4">
            {/* Linked Outdoors */}
            {linkedOutdoors.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Outdoors Vinculados ({linkedOutdoors.length})
                </h4>
                <div className="space-y-2">
                  {linkedOutdoors.map((outdoor) => (
                    <div 
                      key={outdoor.id}
                      className="p-3 bg-muted/50 rounded-lg flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{outdoor.code}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {outdoor.pdvs?.name} • {outdoor.location}
                        </p>
                      </div>
                      <Link 
                        to={`/outdoor/${outdoor.id}`}
                        className="text-primary hover:underline text-sm flex items-center gap-1 shrink-0"
                        onClick={() => onOpenChange(false)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Farmer Info */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Proprietário da Área</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{contract.farmer_name}</span>
                  <span className="text-sm text-muted-foreground">({contract.farmer_cpf})</span>
                </div>
                {contract.farmer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{contract.farmer_phone}</span>
                  </div>
                )}
                {contract.farmer_email && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{contract.farmer_email}</span>
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
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
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
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
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
                  <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pagamento</p>
                    <p className="font-medium">{getPaymentMethodLabel(contract.payment_method)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Renovação Automática</p>
                    <p className="font-medium">{contract.auto_renewal ? 'Sim' : 'Não'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Images Gallery */}
            {images.length > 0 && (
              <>
                <Separator />
                <ContractImageGallery images={images} />
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
