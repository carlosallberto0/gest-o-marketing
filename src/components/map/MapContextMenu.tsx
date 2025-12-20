import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Edit, UserPlus, Power, MapPin, Plus, Megaphone } from 'lucide-react';
import { MapPDV, MapOutdoor } from '@/hooks/useStrategicMapData';

interface MapContextMenuProps {
  children: React.ReactNode;
  contextType: 'pdv' | 'outdoor' | 'empty';
  item?: MapPDV | MapOutdoor;
  position?: { lat: number; lng: number };
  onEditPDV?: (pdv: MapPDV) => void;
  onAssignManager?: (pdv: MapPDV) => void;
  onTogglePDVStatus?: (pdv: MapPDV) => void;
  onEditOutdoor?: (outdoor: MapOutdoor) => void;
  onChangeOutdoorStatus?: (outdoor: MapOutdoor) => void;
  onAddPDVHere?: (lat: number, lng: number) => void;
}

export function MapContextMenu({
  children,
  contextType,
  item,
  position,
  onEditPDV,
  onAssignManager,
  onTogglePDVStatus,
  onEditOutdoor,
  onChangeOutdoorStatus,
  onAddPDVHere,
}: MapContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {contextType === 'pdv' && item && (
          <>
            <ContextMenuItem onClick={() => onEditPDV?.(item as MapPDV)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Posto
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onAssignManager?.(item as MapPDV)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Vincular Gerente
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onTogglePDVStatus?.(item as MapPDV)}>
              <Power className="h-4 w-4 mr-2" />
              {(item as MapPDV).status === 'active' ? 'Inativar' : 'Ativar'}
            </ContextMenuItem>
          </>
        )}

        {contextType === 'outdoor' && item && (
          <>
            <ContextMenuItem onClick={() => onEditOutdoor?.(item as MapOutdoor)}>
              <Megaphone className="h-4 w-4 mr-2" />
              Editar Outdoor
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onChangeOutdoorStatus?.(item as MapOutdoor)}>
              <Power className="h-4 w-4 mr-2" />
              Alterar Status
            </ContextMenuItem>
          </>
        )}

        {contextType === 'empty' && position && (
          <ContextMenuItem onClick={() => onAddPDVHere?.(position.lat, position.lng)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Novo Posto Aqui
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Simplified inline context menu for map markers
export function InlineContextMenu({ 
  x, 
  y, 
  onClose,
  items 
}: { 
  x: number; 
  y: number; 
  onClose: () => void;
  items: Array<{ label: string; icon: React.ReactNode; onClick: () => void; destructive?: boolean }>;
}) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50" 
        onClick={onClose}
      />
      
      {/* Menu */}
      <div 
        className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
        style={{ 
          left: `${x}px`, 
          top: `${y}px`,
          transform: 'translate(0, 0)'
        }}
      >
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors
              ${item.destructive ? 'text-destructive hover:text-destructive' : 'text-foreground'}
            `}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
