import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAlertToast } from '@/hooks/useAlertToast';
import type { Json } from '@/integrations/supabase/types';

// Types for Report Settings
export interface HeaderSettings {
  logo_url: string | null;
  logo_position: 'left' | 'center' | 'right';
  logo_height: number;
  background_color: string;
  text_color: string;
  title: string;
  show_subtitle: boolean;
  show_date: boolean;
  show_on_all_pages: boolean;
}

export interface FooterSettings {
  background_color: string;
  text_color: string;
  content: string;
  show_page_numbers: boolean;
  alignment: 'left' | 'center' | 'right';
}

export interface BodySettings {
  table_header_color: string;
  table_stripe_color: string;
  section_title_color: string;
  density: 'compact' | 'normal' | 'expanded';
}

export interface MarginsSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface GlobalReportSettings {
  page_format: 'a4' | 'letter';
  page_orientation: 'portrait' | 'landscape';
  margins: MarginsSettings;
  font_family: 'helvetica' | 'times' | 'courier';
  font_size: number;
  header: HeaderSettings;
  footer: FooterSettings;
  body: BodySettings;
}

export interface TemplateSettings {
  inherit_global: boolean;
  header_title: string;
  include_images?: boolean;
  image_quality?: 'low' | 'medium' | 'high';
  group_by_city?: boolean;
  sort_by?: string;
}

export interface ReportSettings {
  global: GlobalReportSettings;
  templates: Record<string, TemplateSettings>;
}

// Default settings
export const defaultReportSettings: ReportSettings = {
  global: {
    page_format: 'a4',
    page_orientation: 'portrait',
    margins: { top: 20, bottom: 20, left: 14, right: 14 },
    font_family: 'helvetica',
    font_size: 10,
    header: {
      logo_url: null,
      logo_position: 'left',
      logo_height: 15,
      background_color: '#3b82f6',
      text_color: '#ffffff',
      title: 'Relatório',
      show_subtitle: true,
      show_date: true,
      show_on_all_pages: false,
    },
    footer: {
      background_color: 'transparent',
      text_color: '#808080',
      content: 'Página {{pagina}} de {{total_paginas}} | Gerado em {{data_geracao}}',
      show_page_numbers: true,
      alignment: 'center',
    },
    body: {
      table_header_color: '#3b82f6',
      table_stripe_color: '#f5f5f5',
      section_title_color: '#000000',
      density: 'normal',
    },
  },
  templates: {
    outdoors: {
      inherit_global: true,
      header_title: 'RELAÇÃO DE OUTDOORS - MANUTENÇÃO',
      include_images: true,
      image_quality: 'medium',
      group_by_city: false,
      sort_by: 'code',
    },
    service_orders: {
      inherit_global: true,
      header_title: 'ORDEM DE SERVIÇO',
    },
    merchandising: {
      inherit_global: true,
      header_title: 'RELATÓRIO DE MERCHANDISING',
    },
  },
};

// Hook to fetch report settings
export function useReportSettings() {
  return useQuery({
    queryKey: ['report-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'report_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching report settings:', error);
        return defaultReportSettings;
      }

      if (!data?.value) {
        return defaultReportSettings;
      }

      // Merge with defaults to ensure all properties exist
      const storedSettings = data.value as unknown as ReportSettings;
      return {
        global: {
          ...defaultReportSettings.global,
          ...storedSettings.global,
          margins: {
            ...defaultReportSettings.global.margins,
            ...storedSettings.global?.margins,
          },
          header: {
            ...defaultReportSettings.global.header,
            ...storedSettings.global?.header,
          },
          footer: {
            ...defaultReportSettings.global.footer,
            ...storedSettings.global?.footer,
          },
          body: {
            ...defaultReportSettings.global.body,
            ...storedSettings.global?.body,
          },
        },
        templates: {
          ...defaultReportSettings.templates,
          ...storedSettings.templates,
        },
      };
    },
  });
}

// Hook to update report settings
export function useUpdateReportSettings() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useAlertToast();

  return useMutation({
    mutationFn: async (settings: ReportSettings) => {
      // First check if record exists
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'report_settings')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('system_settings')
          .update({
            value: settings as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq('key', 'report_settings');

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'report_settings',
            value: settings as unknown as Json,
            description: 'Configurações de personalização de relatórios PDF',
          });

        if (error) throw error;
      }
      return settings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-settings'] });
      success('Configurações de relatório salvas com sucesso!');
    },
    onError: (err) => {
      console.error('Error updating report settings:', err);
      showError('Erro ao salvar configurações de relatório.');
    },
  });
}

// Hook to get merged template settings
export function useReportTemplate(templateKey: string) {
  const { data: settings, isLoading } = useReportSettings();

  if (isLoading || !settings) {
    return { data: null, isLoading: true };
  }

  const template = settings.templates[templateKey];
  if (!template) {
    return { data: settings.global, isLoading: false };
  }

  if (template.inherit_global) {
    return {
      data: {
        ...settings.global,
        header: {
          ...settings.global.header,
          title: template.header_title || settings.global.header.title,
        },
        template,
      },
      isLoading: false,
    };
  }

  return { data: { ...settings.global, template }, isLoading: false };
}
