import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showToast } from '@/lib/toast';

export interface ModuleAppearance {
  title: string;
  description: string;
  image_url: string | null;
  icon_color: string;
  button_color: string;
  features: string[];
}

export interface ModuleAppearanceSettings {
  merchandising: ModuleAppearance;
  media: ModuleAppearance;
  mapa: ModuleAppearance;
}

const defaultModuleSettings: ModuleAppearanceSettings = {
  merchandising: {
    title: 'Merchandising',
    description: 'Gestão de checklists, avaliações de PDVs, materiais de trade e campanhas.',
    image_url: null,
    icon_color: '#10b981',
    button_color: '#10b981',
    features: ['Checklists de Avaliação', 'Histórico de Visitas', 'Materiais de Trade', 'Campanhas', 'Relatórios'],
  },
  media: {
    title: 'Mídia Externa',
    description: 'Gestão de outdoors, contratos com produtores, ordens de serviço e avaliações.',
    image_url: null,
    icon_color: '#3b82f6',
    button_color: '#3b82f6',
    features: ['Cadastro de Outdoors', 'Contratos', 'Ordens de Serviço', 'Avaliações de Mídia', 'Fornecedores'],
  },
  mapa: {
    title: 'Mapa Estratégico',
    description: 'Visualização geográfica unificada de PDVs, outdoors e status operacional em tempo real.',
    image_url: null,
    icon_color: '#a855f7',
    button_color: '#a855f7',
    features: ['Mapa Interativo', 'Status em Tempo Real', 'Alertas Visuais', 'KPIs Consolidados', 'Ações Rápidas'],
  },
};

export function useModuleSettings() {
  return useQuery({
    queryKey: ['module-appearance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'module_appearance_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching module settings:', error);
        return defaultModuleSettings;
      }

      if (!data?.value) {
        return defaultModuleSettings;
      }

      // Merge with defaults to ensure all properties exist
      const storedSettings = data.value as unknown as Partial<ModuleAppearanceSettings>;
      return {
        merchandising: { ...defaultModuleSettings.merchandising, ...storedSettings.merchandising },
        media: { ...defaultModuleSettings.media, ...storedSettings.media },
        mapa: { ...defaultModuleSettings.mapa, ...storedSettings.mapa },
      };
    },
  });
}

export function useUpdateModuleSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: ModuleAppearanceSettings) => {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'module_appearance_settings')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            value: JSON.parse(JSON.stringify(settings)), 
            updated_at: new Date().toISOString() 
          })
          .eq('key', 'module_appearance_settings');

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('system_settings')
          .insert([{
            key: 'module_appearance_settings',
            value: JSON.parse(JSON.stringify(settings)),
            description: 'Configurações de aparência dos módulos na tela de seleção',
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-appearance-settings'] });
      showToast.success('Configurações dos módulos salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving module settings:', error);
      showToast.error('Erro ao salvar configurações dos módulos');
    },
  });
}

export { defaultModuleSettings };
